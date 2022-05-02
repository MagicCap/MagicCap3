import { readFile, writeFile, copyFile, mkdir } from "fs/promises";
import crypto from "crypto";
import { homedir } from "os";
import { join } from "path";
import commitHash from "./commit_hash";
import { Uploader, BundleBlob } from "../sharedTypes";

export const uploaders: Map<string, Uploader> = new Map();
export const uploaderSecrets: string[] = [];

const reloadUploaders = () => {
    uploaders.clear();
    const r = eval("require") as NodeRequire;
    delete r.cache[r.resolve(join(homedir(), ".magiccap", "uploaders.js"))];
    const imports: any = r(join(homedir(), ".magiccap", "uploaders.js"));
    for (const key of Object.keys(imports)) {
        // Ignore keys that start with a underscore.
        if (key.startsWith("_")) continue;

        // Load the uploader or secret key array.
        if (key === "secretKeys") {
            uploaderSecrets.length = 0;
            uploaderSecrets.push(...imports[key] as string[]);
        } else {
            uploaders.set(key, imports[key] as Uploader);
        }
    }
};

export const uploadersInit = async () => {
    // Defines the root.
    const root = join(homedir(), ".magiccap");

    // Handle hash comparison.
    const [localBundle, lastBundle] = await Promise.all([
        // Hash local uploaders.js.
        readFile(`${__MAGICCAP_DIST_FOLDER__}/uploaders.js`).then(x => crypto.createHash("sha256").update(x).digest("hex")),

        // Get uploaders_kernel_bundled_hash from ~/.magiccap.
        (async() => {
            const fp = join(root, "uploaders_kernel_bundled_hash");
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
        console.log("Core install changed since uploaders last edited, setting to this installs bundle");
        await mkdir(root, {recursive: true});
        await copyFile(`${__MAGICCAP_DIST_FOLDER__}/uploaders.js`, join(root, "uploaders.js"));
        await copyFile(`${__MAGICCAP_DIST_FOLDER__}/uploaders.js.map`, join(root, "uploaders.js.map"));
        await writeFile(join(root, "uploaders_kernel_commit"), commitHash);
        await writeFile(join(root, "uploaders_kernel_bundled_hash"), localBundle);
    }

    // Now we will load the kernel.
    reloadUploaders();
};

export const doUploadersUpdate = async (blob: BundleBlob): Promise<void> => {
    // Write the new uploaders.
    const root = join(homedir(), ".magiccap");
    await mkdir(root, {recursive: true});
    const buf = Buffer.from(blob.encodedBlob, "base64");
    const uploadersPath = join(root, "uploaders.js");
    await writeFile(uploadersPath, buf);
    await writeFile(join(root, "uploaders.js.map"), Buffer.from(blob.encodedMapBlob, "base64"));
    await writeFile(join(root, "uploaders_kernel_commit"), blob.commitHash);

    // Clear from the require cache and reload the uploaders.
    reloadUploaders();
};
