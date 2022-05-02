import { Display } from "electron";
import sharp from "sharp";
import database from "./database";
import {
    BundleBlob, ConfigInterface, EditorCtx, EditorDone,
    EditorInfo, EditorInfoWithID, EditorRegisterCtx
} from "../sharedTypes";
import { homedir } from "os";
import { join } from "path";
import { readFile, mkdir, copyFile, writeFile } from "fs/promises";
import crypto from "crypto";
import commitHash from "./commit_hash";

export class BaseEditorCtx implements EditorCtx {
    public config: ConfigInterface;
    public event: EditorDone;
    public display: Display;
    private buf: Buffer;

    constructor(event: EditorDone, display: Display, buf: Buffer) {
        this.config = database;
        this.event = event;
        this.display = display;
        this.buf = buf;
    }

    public getFullscreen(deepCopy: boolean) {
        if (!deepCopy) return this.buf;
        return this.buf.slice(0);
    }

    public async getRegion(relTop: number, relLeft: number, width: number, height: number) {
        return await sharp(this.buf).extract({
            left: relLeft,
            top: relTop,
            width, height
        }).toBuffer();
    }
}

const editorMap: Map<string, {editorInfo: EditorInfo, cb: (ctx: EditorCtx) => Promise<Buffer>}> = new Map();

export const getEditors = (): EditorInfoWithID[] => {
    const a: EditorInfoWithID[] = [];
    editorMap.forEach((v, id) => a.push({id, ...v.editorInfo}));
    return a.sort((a, b) => a.index - b.index);
};

class BaseConstructor implements EditorRegisterCtx {
    config = database;
    public id: string;

    constructor(id: string) {
        this.id = id;
    }

    register(editorInfo: EditorInfo, cb: (ctx: EditorCtx) => Promise<Buffer>): () => void {
        editorMap.set(this.id, {editorInfo, cb});
        return () => editorMap.delete(this.id);
    }
}

const unregisterFuncs: Map<string, () => void> = new Map();

const reloadEditors = () => {
    unregisterFuncs.forEach(val => val());
    unregisterFuncs.clear();
    const r = eval("require") as NodeRequire;
    delete r.cache[r.resolve(join(homedir(), ".magiccap", "editors.js"))];
    const imports: any = r(join(homedir(), ".magiccap", "editors.js"));
    for (const key of Object.keys(imports)) {
        // Ignore keys that start with a underscore.
        if (key.startsWith("_")) continue;

        // Load the editor.
        imports[key](new BaseConstructor(key));
    }
};

export const editorsInit = async () => {
    // Defines the root.
    const root = join(homedir(), ".magiccap");

    // Handle hash comparison.
    const [localBundle, lastBundle] = await Promise.all([
        // Hash local editors.js.
        readFile(`${__MAGICCAP_DIST_FOLDER__}/editors.js`).then(x => crypto.createHash("sha256").update(x).digest("hex")),

        // Get editors_bundled_hash from ~/.magiccap.
        (async() => {
            const fp = join(root, "editors_bundled_hash");
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
        console.log("Core install changed since editors last edited, setting to this installs bundle");
        await mkdir(root, {recursive: true});
        await copyFile(`${__MAGICCAP_DIST_FOLDER__}/editors.js`, join(root, "editors.js"));
        await copyFile(`${__MAGICCAP_DIST_FOLDER__}/editors.js.map`, join(root, "editors.js.map"));
        await writeFile(join(root, "editors_commit"), commitHash);
        await writeFile(join(root, "editors_bundled_hash"), localBundle);
    }

    // Now we will load the editors.
    reloadEditors();
};

export const callEditor = async (ctx: EditorCtx): Promise<Buffer> => {
    const editor = editorMap.get(ctx.event.editorId);
    if (!editor) throw new Error(`Unknown editor ${ctx.event.editorId}`);
    return await editor.cb(ctx);
};

export const doEditorsUpdate = async (blob: BundleBlob): Promise<void> => {
    // Write the new editors.
    const root = join(homedir(), ".magiccap");
    await mkdir(root, {recursive: true});
    const buf = Buffer.from(blob.encodedBlob, "base64");
    const editorsPath = join(root, "editors.js");
    await writeFile(editorsPath, buf);
    await writeFile(join(root, "editors.js.map"), Buffer.from(blob.encodedMapBlob, "base64"));
    await writeFile(join(root, "editors_commit"), blob.commitHash);

    // Clear from the require cache and reload the editors.
    reloadEditors();
};
