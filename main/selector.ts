import { BrowserWindow, screen, ipcMain, Display } from "electron";
import { Mutex } from "async-mutex";
import { v4 } from "uuid";
import screenshotter from "./screenshotter";
import { flatPromise } from "./utils";
import { BaseEditorCtx, callEditor } from "./editors";
import {
    SelectorDone, SelectorBaseConfig, SelectorScreenSpecificConfig,
    EditorDone, EditorCtx, AnnouncementPayload, SelectorResult,
    BundleBlob,
} from "../sharedTypes";
import sharp from "sharp";
import { homedir } from "os";
import { join } from "path";
import { readFile, mkdir, copyFile, writeFile } from "fs/promises";
import crypto from "crypto";
import commitHash from "./commit_hash";

// Handle initializing the selector.
export const selectorInit = async () => {
    // Defines the root.
    const root = join(homedir(), ".magiccap");

    // Handle hash comparison.
    const [localBundle, lastBundle] = await Promise.all([
        // Hash local selector.js.
        readFile(`${__MAGICCAP_DIST_FOLDER__}/selector.js`).then(x => crypto.createHash("sha256").update(x).digest("hex")),

        // Get selector_bundled_hash from ~/.magiccap.
        (async() => {
            const fp = join(root, "selector_bundled_hash");
            try {
                // Read the file.
                return await readFile(fp).then(x => x.toString());
            } catch (_) {
                // Ignore this error.
            }
        })(),
    ]);
    if (localBundle !== lastBundle) {
        // In this situation, we should write our local bundle.
        console.log("Core install changed since selector last edited, setting to this installs bundle");
        await mkdir(root, {recursive: true});
        await copyFile(`${__MAGICCAP_DIST_FOLDER__}/selector.html`, join(root, "selector.html"));
        await copyFile(`${__MAGICCAP_DIST_FOLDER__}/selector.js`, join(root, "selector.js"));
        await copyFile(`${__MAGICCAP_DIST_FOLDER__}/selector.js.map`, join(root, "selector.js.map"));
        await writeFile(join(root, "selector_commit"), commitHash);
        await writeFile(join(root, "selector_bundled_hash"), localBundle);
    }
};

// Pooling does help performance. However, macOS/a lot of Linux DE's cannot reliably spawn the window when pooled.
// To get around this, pooling is here for Gnome users, but off for the rest.
const usePool = process.env.XDG_CURRENT_DESKTOP === "Unity" || (process.env.XDG_CURRENT_DESKTOP || "").toLowerCase().includes("gnome");

// Log if we are pooling.
console.log("using pooling strategy:", usePool);

class SelectorManager {
    private selectorPool: Map<string, {selector: BrowserWindow, uuid: string}>;
    private poolMutex: Mutex;
    private selectorMutex: Mutex;

    constructor() {
        this.selectorPool = new Map();
        this.poolMutex = new Mutex();
        this.selectorMutex = new Mutex();
    }

    private async _wrappedInit() {
        // If the length of selector pool isn't 0, return here.
        if (this.selectorPool.size !== 0) return;

        const remap = async() => {
            // Get the screen list.
            const s = await screen.getAllDisplays();

            // Create a pool based on selectors in each display.
            s.forEach(display => {
                // Create a browser window that when visible will take up the whole screen with full focus.
                const selector = new BrowserWindow({
                    width: display.size.width,
                    height: display.size.height,
                    x: display.bounds.x,
                    y: display.bounds.y,
                    frame: false,
                    alwaysOnTop: true,
                    simpleFullscreen: true,
                    show: false,
                    webPreferences: {
                        nodeIntegration: true,
                        contextIsolation: false,
                    },
                });
                const uuid = v4();
                selector.loadURL(`file://${join(homedir(), ".magiccap")}/selector.html#${uuid}`);

                // Map the selector to the display.
                this.selectorPool.set(`${display.bounds.x},${display.bounds.y}`, {selector, uuid});
            });
        };

        // Handle events.
        const eventHandler = async () => {
            const unlocker = await this.poolMutex.acquire();
            this.selectorPool.forEach(val => val.selector.destroy());
            this.selectorPool.clear();
            try {
                await remap();
            } finally {
                unlocker();
            }
        };
        screen.on("display-added", eventHandler);
        screen.on("display-removed", eventHandler);
        screen.on("display-metrics-changed", eventHandler);

        // Call the remap function.
        return await remap();
    }

    async ensureInit() {
        // If we shouldn't use the pool, return here.
        if (!usePool) return;

        // Lock the mutex.
        const unlocker = await this.poolMutex.acquire();

        // Run the init function and release the mutex.
        try {
            await this._wrappedInit();
        } finally {
            unlocker();
        }
    }

    private async _wrappedUse(config: SelectorBaseConfig): Promise<SelectorResult | null> {
        // Make sure the windows are initialised before hand if this is pooled.
        await this.ensureInit();

        // Defines the promise that it is called when it is done.
        const [doneResolver, donePromise] = flatPromise<{
            reply: SelectorDone; d: Display; image: Buffer;
            editors: {left: number; top: number; buf: Buffer}[];
        }>();

        // Create/manage each window.
        let displays: {
            win: {selector: BrowserWindow, uuid: string},
            doneCb: (_: any, done: SelectorDone) => void,
            undoCb: () => void,
            editorCb: (_: any, done: EditorDone) => void,
            announcementCb: (_: any, announcement: AnnouncementPayload) => void,
        }[] = [];
        let ignoreUuid = "";
        const cursor = screen.getCursorScreenPoint();
        const cursorDisplay = screen.getDisplayNearestPoint(cursor);
        displays = await Promise.all((await screen.getAllDisplays()).map(d => {
            return (async (d: Display) => {
                // Get the screenshot.
                const t1 = Date.now();
                const {image, notch} = (await screenshotter.captureScreen(d))!;
                console.log("time to screenshot:", Date.now() - t1);

                // Defines the editor events.
                const editors: {left: number; top: number; buf: Buffer}[] = [];

                // Get the relevant window.
                const win = usePool ? this.selectorPool.get(`${d.bounds.x},${d.bounds.y}`) : {
                    selector: new BrowserWindow({
                        width: d.size.width,
                        height: d.size.height,
                        x: d.bounds.x,
                        y: d.bounds.y,
                        frame: false,
                        alwaysOnTop: true,
                        show: false,
                        webPreferences: {
                            nodeIntegration: true,
                            contextIsolation: false,
                        },
                        backgroundColor: "#000000",
                    }),
                    uuid: v4(),
                };
                if (!win) {
                    // Ok fuck it, this is actually bad. This should never be hit due to the resyncing.
                    throw new Error("Failed to find display in pre-rendered windows.");
                }

                // Handle if this is a fresh window not from a pool.
                if (!usePool) {
                    const p = new Promise(res => ipcMain.once(`selector:listening:${win.uuid}`, res));
                    win.selector.loadURL(`file://${join(homedir(), ".magiccap")}/selector.html#${win.uuid}`);
                    win.selector.setSimpleFullScreen(true);
                    await p;
                }

                // Make sure the selector is on the right display.
                const pos = win.selector.getPosition();
                if (pos[0] !== d.bounds.x || pos[1] !== d.bounds.y) win.selector.setPosition(d.bounds.x, d.bounds.y);

                // Handle when the selector is ready.
                ipcMain.once(`selector:ready:${win.uuid}`, () => {
                    win.selector.show();
                    if (usePool) {
                        win.selector.focus();
                        win.selector.setSimpleFullScreen(true);
                    }
                });

                // Handle when the editor is used.
                const editorCb = (_: any, done: EditorDone) => {
                    // Make a copy of the event.
                    const doneCpy: EditorDone = Object.assign({}, done);

                    // Create the base context.
                    const ctx: EditorCtx = new BaseEditorCtx(done, d, image);

                    // Call the editor and then send back the result.
                    callEditor(ctx)
                        .then(buf => {
                            editors.push({left: doneCpy.relativeLeft, top: doneCpy.relativeTop, buf});
                            win.selector.webContents.send("selector:editor_done", {origin: doneCpy, enc: buf.toString("base64")});
                        })
                        .catch(err => win.selector.webContents.send("selector:editor_done", {err: err.message, id: ctx.event.editorId}));
                };
                ipcMain.on(`selector:editor:${win.uuid}`, editorCb);

                // Handle undos.
                const undoCb = () => {
                    // Pop the editor. This will gracefully handle if there's nothing to undo too.
                    editors.pop();
                };
                ipcMain.on(`selector:undo:${win.uuid}`, undoCb);

                // Handle announcements.
                const announcementCb = (_: any, announcement: AnnouncementPayload) => {
                    for (const d of displays) {
                        if (d.win.uuid === win.uuid) continue;
                        d.win.selector.webContents.send("selector:announcement", announcement);
                    }
                };
                ipcMain.on(`selector:announcement:${win.uuid}`, announcementCb);

                // Handle when the selector is done.
                const doneCb = (_: any, reply: SelectorDone) => {
                    // Remove the editor listener.
                    ipcMain.removeListener(`selector:editor:${win.uuid}`, editorCb);

                    // Remove the undo listener.
                    ipcMain.removeListener(`selector:undo:${win.uuid}`, undoCb);

                    // Remove the announcement listener.
                    ipcMain.removeListener(`selector:announcement:${win.uuid}`, announcementCb);

                    // We want to ignore this UUID when we hide.
                    ignoreUuid = win.uuid;

                    // Hide or destroy the window.
                    if (usePool) {
                        // Just hide the window.
                        win.selector.hide();
                    } else {
                        // Exit simple fullscreen first to give back focus.
                        win.selector.setSimpleFullScreen(false);
                        win.selector.close();
                    }

                    // Call the promise resolver.
                    doneResolver({reply, d, image, editors});
                };
                ipcMain.once(`selector:done:${win.uuid}`, doneCb);

                // Get the cursor position.
                const displayRelCursorPosition = cursorDisplay === d ? {x: (cursor.x - d.bounds.x) / d.scaleFactor, y: (cursor.y - d.bounds.y) / d.scaleFactor} : null;

                // Send the configuration in an async style.
                win.selector.webContents.send("selector:config", {
                    image: image.toString("base64"),
                    cursorPosition: displayRelCursorPosition,
                    displayBounds: d.bounds,
                    scale: d.scaleFactor,
                    notch,
                    ...config,
                } as SelectorScreenSpecificConfig);

                // Return the window and callbacks.
                return {win, announcementCb, editorCb, undoCb, doneCb};
            })(d);
        }));

        // Wait for a display to be done.
        const {reply, d, image, editors} = await donePromise;

        // Pass through destroy events to all other windows, remove un-called callbacks from main to stop a leak, and hide them.
        displays.forEach(({win, announcementCb, editorCb, undoCb, doneCb}) => {
            // Ignore the window that is done.
            if (win.uuid === ignoreUuid) return;

            // Hide or destroy the window.
            if (usePool) {
                // Just hide the window.
                win.selector.hide();
            } else {
                // Exit simple fullscreen first to give back focus.
                win.selector.setSimpleFullScreen(false);
                win.selector.close();
            }

            // Remove the announcement callback.
            ipcMain.removeListener(`selector:announcement:${win.uuid}`, announcementCb);

            // Remove the editor callback.
            ipcMain.removeListener(`selector:editor:${win.uuid}`, editorCb);

            // Remove the undo callback.
            ipcMain.removeListener(`selector:undo:${win.uuid}`, undoCb);

            // Remove the done callback.
            ipcMain.removeListener(`selector:done:${win.uuid}`, doneCb);

            // Send the selector a destroy event.
            if (usePool) win.selector.webContents.send("selector:destroy");
        });

        // Handle cancellation.
        if (reply.cancelled) return null;

        // Handle writing the editors to the screenshot.
        let finalImage = image;
        if (editors.length !== 0) {
            finalImage = await sharp(image).composite(editors.map(x => {
                return {
                    input: x.buf,
                    left: Math.floor(x.left * d.scaleFactor),
                    top: Math.floor(x.top * d.scaleFactor),
                };
            })).toBuffer();
        }

        // Handle the reply.
        const relPosition = {
            width: reply.width * d.scaleFactor,
            height: reply.height * d.scaleFactor,
            top: reply.relativeTop * d.scaleFactor,
            left: reply.relativeLeft * d.scaleFactor,
        };
        const result = {
            display: d,
            relPosition: relPosition,
            actualPosition: {
                width: reply.width,
                height: reply.height,
                top: reply.relativeTop + d.bounds.y,
                left: reply.relativeLeft + d.bounds.x,
            },
        } as SelectorResult;
        if (config.returnRegion) {
            // In this case, we should use sharp to crop the image.
            result.selection = await sharp(finalImage).extract(relPosition).toBuffer();
        }
        return result;
    }

    async use(config: SelectorBaseConfig) {
        const unlocker = await this.selectorMutex.acquire();
        try {
            return this._wrappedUse(config);
        } finally {
            unlocker();
        }
    }

    async kill(lock?: boolean) {
        let unlocker = lock ? await this.selectorMutex.acquire() : () => {};
        try {
            this.selectorPool.forEach(x => x.selector.destroy());
            this.selectorPool.clear();
        } finally {
            unlocker();
        }
    }
}

const manager = new SelectorManager();

export const doSelectorUpdate = async (blob: BundleBlob): Promise<void> => {
    const root = join(homedir(), ".magiccap");
    await mkdir(root, {recursive: true});
    const buf = Buffer.from(blob.encodedBlob, "base64");
    const uploadersPath = join(root, "selector.js");
    await writeFile(uploadersPath, buf);
    await writeFile(join(root, "selector.js.map"), Buffer.from(blob.encodedMapBlob, "base64"));
    await writeFile(join(root, "selector_commit"), blob.commitHash);
    await manager.kill(true);
    await manager.ensureInit();
};

export default manager;
