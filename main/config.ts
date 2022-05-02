import eventTypes from "./config_callbacks";
import { onCapture } from "./database";
import commitHash from "./commit_hash";
import { Capture, RequestPacket, BundleBlob } from "../sharedTypes";
import { ipcMain, BrowserWindow, app } from "electron";
import { join } from "path";
import { homedir } from "os";
import crypto from "crypto";
import { writeFile, readFile, mkdir, copyFile } from "fs/promises";

// Handle initializing the config.
export const configInit = async () => {
    // Defines the root.
    const root = join(homedir(), ".magiccap");

    // Handle hash comparison.
    const [localBundle, lastBundle] = await Promise.all([
        // Hash local config.js.
        readFile(`${__MAGICCAP_DIST_FOLDER__}/config.js`).then(x => crypto.createHash("sha256").update(x).digest("hex")),

        // Get config_bundled_hash from ~/.magiccap.
        (async() => {
            const fp = join(root, "config_bundled_hash");
            try {
                // Read the file.
                return await readFile(fp).then(x => x.toString());
            } catch (_) {
                // Ignore this error.
            }
        })()
    ]);
    if (localBundle !== lastBundle) {
        // In this situation, we should write our local bundle.
        console.log("Core install changed since config last edited, setting to this installs bundle");
        await mkdir(root, {recursive: true});
        await copyFile(`${__MAGICCAP_DIST_FOLDER__}/config.html`, join(root, "config.html"));
        await copyFile(`${__MAGICCAP_DIST_FOLDER__}/config.js`, join(root, "config.js"));
        await copyFile(`${__MAGICCAP_DIST_FOLDER__}/config.js.map`, join(root, "config.js.map"));
        await writeFile(join(root, "config_commit"), commitHash);
        await writeFile(join(root, "config_bundled_hash"), localBundle);
    }
};

// Defines the window. This is on the outer scope since it can be focused.
let win: BrowserWindow | null;

// Handle sockets from the config process.
ipcMain.on("config:request", (_, packet: any) => {
    // Get the ID and data.
    const id: string = packet.id;
    const data: RequestPacket = packet.data;

    // Process the event.
    (async() => {
        try {
            const res = await eventTypes[data.type](data.data, win!);
            if (win) win.webContents.send(`config:request:${id}`, {data: res});
        } catch (e) {
            if (win) win.webContents.send(`config:request:${id}`, {err: `${(e as any).message ? (e as any).message : e}`});
        }
    })();
});

// Dispatch the capture event.
onCapture((capture: Capture) => {
    if (win) win.webContents.send("config:capture", capture);
});

// Manage the config window.
export default () => {
    // If the window exists, we should focus it and return.
    if (win) return win.focus();

    // Create the window.
    win = new BrowserWindow({
        width: 1000,
        height: 500,
        show: false,
        vibrancy: "appearance-based",
        webPreferences: {
            preload: `${__MAGICCAP_DIST_FOLDER__}/config_preload.js`
        }
    });
    win.loadFile(`${join(homedir(), ".magiccap")}/config.html`);
    if (process.env.NODE_ENV === "development") win.webContents.openDevTools({
        mode: "detach",
    });

    // Make sure it shows when it is ready.
    win.once("ready-to-show", () => {
        win!.show();
        if (app.dock) app.dock.show();
    });

    // Destroy the window object when it is closed.
    win.once("close", () => {
        win = null;
        if (app.dock) app.dock.hide();
    });
};

export const doConfigUpdate = async (blob: BundleBlob): Promise<void> => {
    const root = join(homedir(), ".magiccap");
    await mkdir(root, {recursive: true});
    const buf = Buffer.from(blob.encodedBlob, "base64");
    const uploadersPath = join(root, "config.js");
    await writeFile(uploadersPath, buf);
    await writeFile(join(root, "config.js.map"), Buffer.from(blob.encodedMapBlob, "base64"));
    await writeFile(join(root, "config_commit"), blob.commitHash);
    if (win) win.close();
};

// Kill the config.
export const killConfig = () => {
    if (win) win.close();
    ipcMain.removeAllListeners("config:request");
};
