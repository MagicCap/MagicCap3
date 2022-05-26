import { JSONValue, JSONableUploaderDetails, OAuthClientInformation, UploaderOption } from "../sharedTypes";
import database from "./database";
import tray from "./tray";
import { uploaders, uploaderSecrets } from "./uploaders";
import hotkeys, { blockHotkeys, unblockHotkeys } from "./hotkeys";
import { join } from "path";
import { readFile, unlink } from "fs/promises";
import { app, BrowserWindow, shell, dialog, Event, Input } from "electron";
import linuxKeymap from "./linux_keymap";
import buildConfigIsolate from "./build_config_isolate";
import { OAuthFlowStartResult, startOAuth2Flow, cancelOAuth2Flow } from "./external_api_router";
import open from "open";
import { homedir } from "os";

// Gets the config.
async function getConfig(): Promise<{[key: string]: JSONValue}> {
    return database.getAllOptions();
}

// Writes the config.
async function writeConfig(changes: {
    rem: string[];
    set: {[key: string]: JSONValue};
}): Promise<void> {
    for (const key of changes.rem) database.setConfig(key, undefined);
    for (const key in changes.set) {
        // Handle the key related to startup.
        if (key === "open_login") app.setLoginItemSettings({
            openAtLogin: Boolean(changes.set[key]),
        });

        // Handle writing the key in the config.
        database.setConfig(key, changes.set[key]);
    }
    tray();
    hotkeys();
}

// Gets the uploaders.
async function getUploaders(): Promise<{[id: string]: JSONableUploaderDetails}> {
    const o: {[id: string]: JSONableUploaderDetails} = {};
    uploaders.forEach((uploader, key) => {
        o[key] = {
            name: uploader.name,
            description: uploader.description,
            category: uploader.category,
            options: uploader.options.map(x => {
                const copy: UploaderOption = {...x};
                // @ts-ignore
                if (copy.type === "oauth2") delete copy.callback;
                return copy;
            }),
            icon: uploader.icon.toString("base64"),
        };
    });
    return o;
}

// Tests a uploader.
async function testUploader(id: string): Promise<void> {
    // Get a buffer.
    const buf = await readFile(join(__MAGICCAP_DIST_FOLDER__, "..", "assets", "taskbar.png"));

    // Get the uploader.
    const uploader = uploaders.get(id);
    if (!uploader) throw new Error("Uploader not found.");

    // Get the isolated part of the config.
    const configIsolate = buildConfigIsolate(uploader);

    // Perform the upload.
    await uploader.upload(configIsolate, buf, "test_image.png");
}

// Do a database query.
async function databaseQuery([query, data]: [string, JSONValue[]]): Promise<{[key: string]: JSONValue}[]> {
    return database.db.prepare(query).all(...data);
}

// Do a database exec.
async function databaseExec([query, data]: [string, JSONValue[]]): Promise<void> {
    await database.db.prepare(query).run(...data);
}

// Allows a file to be deleted, but only after it is validated to be from an actual capture.
async function validatedFileRemoval([filePath, timestamp]: [string, number]): Promise<void> {
    const res = await database.rawCaptureGet(timestamp);
    if (!res) throw new Error("Capture does not exist! You cannot delete a file that doesn't belong to a capture.");
    if (res.file_path !== filePath) throw new Error("File path is not the same as the capture.");
    await unlink(filePath);
}

// Allows a file to be opened, but only after it is validated to be an actual capture.
async function validatedFileOpen([filePath, timestamp]: [string, number]): Promise<void> {
    const res = await database.rawCaptureGet(timestamp);
    if (!res) throw new Error("Capture does not exist! You cannot open a file that doesn't belong to a capture.");
    if (res.file_path !== filePath) throw new Error("File path is not the same as the capture.");
    await shell.openPath(filePath);
}

// Allows a files folder to be opened, but only after it is validated to be an actual capture.
async function validatedFolderOpen([filePath, timestamp]: [string, number]): Promise<void> {
    const res = await database.rawCaptureGet(timestamp);
    if (!res) throw new Error("Capture does not exist! You cannot open a file that doesn't belong to a capture.");
    if (res.file_path !== filePath) throw new Error("File path is not the same as the capture.");
    await shell.showItemInFolder(filePath);
}

// Allows a URL to be opened, but only after it is validated to be a valid URL and an actual capture.
async function validatedUrlOpen([url, timestamp]: [string, number]): Promise<void> {
    // Validate the URL belongs to a capture.
    const res = await database.rawCaptureGet(timestamp);
    if (!res) throw new Error("Capture does not exist! You cannot open a URL that doesn't belong to a capture.");
    if (res.url !== url) throw new Error("URL is not the same as the capture.");

    // Validate the URL is actually http or https.
    const urlParsed = new URL(url);
    if (urlParsed.protocol !== "http:" && urlParsed.protocol !== "https:") throw new Error("URL is not HTTP or HTTPS.");

    // Open the URL.
    await shell.openExternal(url);
}

// Get the default file path for captures.
async function defaultFilePath(): Promise<string> {
    return join(app.getPath("pictures"), "MagicCap");
}

// Open the folder.
async function openFolder(_: any, win: BrowserWindow): Promise<string | null> {
    const open = await dialog.showOpenDialog(win, {
        title: "Open folder",
        properties: ["createDirectory", "openDirectory"],
    });
    if (open.filePaths && open.filePaths.length !== 0) return open.filePaths[0];
    return null;
}

// Handle getting iohook in a way that doesn't piss off TS too much.
let iohook: any;
// @ts-ignore
if (process.platform === "linux") iohook = globalThis.iohook;

// Defines the hotkey listener.
let listener: any;

// Wait for a hotkey. This should NOT be called multiple times before stop.
async function waitForHotkey(_: any, win: BrowserWindow): Promise<void> {
    blockHotkeys();
    if (process.platform === "linux") {
        iohook.start();
        listener = (event: any) => {
            // Handle getting the modifiers from the event.
            const modifiers: string[] = [];
            if (event.altKey) modifiers.push("Alt");
            if (event.ctrlKey) modifiers.push("Control");
            if (event.shiftKey) modifiers.push("Shift");
            if (event.metaKey) modifiers.push("Meta");

            // Handle getting the key from the raw keycode and turning it into a string.
            const s = linuxKeymap[event.keycode];
            if (!s) {
                console.log("Unknown keycode:", event.keycode);
                return;
            }

            // Push the hotkey event.
            win.webContents.send("config:hotkey", {
                modifiers: modifiers,
                key: s,
            });
        };
        iohook.on("keydown", listener);
    } else {
        listener = (event: Event, input: Input) => {
            event.preventDefault();
            win.webContents.send("config:hotkey", input);
        };
        win.webContents.on("before-input-event", listener);
    }
    win.once("close", () => {
        // When this window is killed, we want to make sure the hotkey block is too.
        if (iohook) {
            iohook.stop();
            if (listener) iohook.removeListener("keydown", listener);
        }
        unblockHotkeys();
    });
}

// Stop waiting for a hotkey.
async function unwaitForHotkey(_: any, win: BrowserWindow): Promise<void> {
    unblockHotkeys();
    if (iohook) {
        iohook.stop();
        if (listener) iohook.removeListener("keypress", listener);
    } else {
        if (listener) win.webContents.removeListener("before-input-event", listener);
    }
    listener = undefined;
}

// Start the OAuth2 flow and open the browser.
async function openOAuth2Flow([uploaderId, optionKey, option]: [string, string, OAuthClientInformation], win: BrowserWindow): Promise<string> {
    let flow: OAuthFlowStartResult;
    flow = startOAuth2Flow(option, params => {
        // Run the callback handlers config function.
        const uploader = uploaders.get(uploaderId);
        if (!uploader) {
            win.webContents.send(`config:oauth2:${flow.id}`, ["Failed to get the uploader."]);
            return;
        }

        // Get the option.
        let option;
        for (const o of uploader.options) {
            if (o.key === optionKey) {
                option = o;
                break;
            }
        }
        if (!option) {
            win.webContents.send(`config:oauth2:${flow.id}`, ["Failed to get the option."]);
            return;
        }

        // Run the callback.
        if (option.type !== "oauth2") {
            win.webContents.send(`config:oauth2:${flow.id}`, ["Option is not oauth2."]);
            return;
        }
        option.callback(database, params).then(x => {
            win.webContents.send(`config:oauth2:${flow.id}`, [null, x]);
        }).catch(err => {
            win.webContents.send(`config:oauth2:${flow.id}`, [err.message]);
        });
    });
    win.on("close", () => {
        // Garbage collect this OAuth2 flow when the config is closed.
        cancelOAuth2Flow(flow.id);
    });
    open(flow.initUrl);
    return flow.id;
}

// Cancels the specified OAuth2 flow.
async function cancelOAuth2FlowHook(id: string): Promise<void> {
    cancelOAuth2Flow(id);
}

// Gets all hashes related to the current version.
async function getCommits(): Promise<{[moduleName: string]: string}> {
    const root = join(homedir(), ".magiccap");
    const hashes: {[moduleName: string]: string} = {};
    await Promise.all(["config", "main", "editors", "uploaders_kernel", "selector"].
        map(async x => {
            hashes[x] = await readFile(`${root}/${x}_commit`).then(x => x.toString());
        }));
    return hashes;
}

// Used to destroy the users configuration.
async function destroyConfig(includeCaptures: boolean): Promise<void> {
    const toPurge = database.getAllOptions();
    for (const key in toPurge) database.setConfig(key, undefined);
    if (includeCaptures) {
        // We should also delete all captures from the database.
        database.db.exec("DELETE FROM captures");
    }
    __MAGICCAP_RELOAD_MAIN__();
}

// Get the secret keys for the config.
async function getSecretConfigKeys(): Promise<string[]> {
    return uploaderSecrets;
}

// Defines the various event types.
export default {
    getConfig, writeConfig, getUploaders, testUploader,
    databaseQuery, databaseExec, validatedFileRemoval,
    validatedFileOpen, validatedFolderOpen, validatedUrlOpen,
    defaultFilePath, openFolder, waitForHotkey, unwaitForHotkey,
    openOAuth2Flow, cancelOAuth2Flow: cancelOAuth2FlowHook,
    getCommits, destroyConfig, getSecretConfigKeys,
} as {[key: string]: (data: any, win: BrowserWindow) => Promise<any>};
