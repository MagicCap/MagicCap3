import { mkdirSync } from "fs";
import { homedir } from "os";
import { join } from "path";
import { databaseMigrations } from "./migrations";
import { Capture, JSONValue, ConfigInterface } from "../sharedTypes";
import SQLite3 from "better-sqlite3";

const sqlOperations = [
    // Create the config table.
    "CREATE TABLE IF NOT EXISTS `config` (`key` TEXT NOT NULL, `value` TEXT NOT NULL)",

    // Create the captures table.
    "CREATE TABLE IF NOT EXISTS `captures` (`filename` TEXT NOT NULL, `success` INTEGER NOT NULL, `timestamp` INTEGER NOT NULL, `url` TEXT, `file_path` TEXT)",

    // Create the timestamp indexes on captures.
    "CREATE INDEX IF NOT EXISTS TimestampIndex ON captures (timestamp)",
    "CREATE UNIQUE INDEX IF NOT EXISTS capture_unique_ts ON captures (timestamp)",

    // Create the uploader tokens table.
    "CREATE TABLE IF NOT EXISTS tokens (token TEXT NOT NULL, expires INTEGER NOT NULL, uploader TEXT NOT NULL)",
];

class Database implements ConfigInterface {
    private _configItems: Map<string, JSONValue>;
    private readonly _path: string;
    private readonly _configDelete: SQLite3.Statement;
    private readonly _configInsert: SQLite3.Statement;
    private readonly _captureTimestampGet: SQLite3.Statement;
    public db: SQLite3.Database;

    constructor() {
        // Get the folder path.
        this._path = join(homedir(), ".magiccap");

        // Ensure ~/.magiccap exists.
        mkdirSync(this._path, {recursive: true});

        // Add magiccap.db to the path.
        this._path = join(this._path, "magiccap.db");

        // Create the database.
        this.db = SQLite3(this._path);

        // Create the tables.
        sqlOperations.forEach(stmt => this.db.prepare(stmt).run());

        // Prepare the config queries.
        this._configDelete = this.db.prepare("DELETE FROM config");
        this._configInsert = this.db.prepare("INSERT INTO config VALUES (?, ?)");

        // Prepare any capture queries.
        this._captureTimestampGet = this.db.prepare("SELECT * FROM captures WHERE timestamp = ?");

        // Load the config items.
        this._configItems = new Map<string, JSONValue>();
        this.db.prepare("SELECT * FROM config").all().map(x => {
            // Add the key into the database.
            this._configItems.set(x.key, JSON.parse(x.value));
        });

        // Run all of the database migrations.
        databaseMigrations.forEach(f => f(this));
    }

    getAllOptions() {
        const o: {[key: string]: JSONValue} = {};
        this._configItems.forEach((value, key) => {
            o[key] = value;
        });
        return o;
    }

    rawCaptureGet(timestamp: number) {
        return this._captureTimestampGet.get(timestamp);
    }

    getConfig(key: string) {
        return this._configItems.get(key);
    }

    setConfig(key: string, value: JSONValue | undefined) {
        // Handle setting or deleting the value.
        if (value === undefined) this._configItems.delete(key);
        else this._configItems.set(key, value);

        // Write the config table.
        const objs: {key: string, value: string}[] = [];
        this._configItems.forEach((value, key) => objs.push({key, value: JSON.stringify(value)}));
        this.db.transaction(items => {
            this._configDelete.run();
            for (const item of items) this._configInsert.run(item.key, item.value);
        })(objs);
    }
}

const instance = new Database();

const dispatchers: ((capture: Capture) => void)[] = [];

export const onCapture = (f: (capture: Capture) => void) => dispatchers.push(f);

export class CaptureResult {
    public filename: string;
    public success: boolean;
    public url: string | null;
    public filePath: string | null;

    constructor(filename: string) {
        this.filename = filename;
        this.success = false;
        this.url = null;
        this.filePath = null;
    }

    public write() {
        const timestamp = new Date().getTime();
        const query = instance.db.prepare(
            "INSERT INTO captures (filename, success, timestamp, url, file_path) VALUES (?, ?, ?, ?, ?)");
        query.run(this.filename, this.success ? 1 : 0, timestamp, this.url, this.filePath);
        const cap: Capture = {
            filePath: this.filePath,
            filename: this.filename,
            success: this.success,
            timestamp: timestamp,
            url: this.url,
        };
        for (const f of dispatchers) f(cap);
    }
}

export default instance;
