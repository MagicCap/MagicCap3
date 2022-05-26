import { app, dialog } from "electron";
import { join, sep } from "path";
import { homedir } from "os";
import { constants } from "fs";
import { readFile, writeFile, access } from "fs/promises";
import fetch, { Response } from "node-fetch";
import { exec } from "child_process";
import sudo from "sudo-prompt";
import database from "./database";
import commitHash from "./commit_hash";
import { CoreBlob, UpdateAPIResponse } from "../sharedTypes";
import { doConfigUpdate } from "./config";
import { doUploadersUpdate } from "./uploaders";
import { doEditorsUpdate } from "./editors";
import { doSelectorUpdate } from "./selector";

declare global {
    const __MAGICCAP_RELOAD_MAIN__: () => void;
}

// Creates a promise to get all the commits.
const getCommits = async () => {
    // Get the root path.
    const root = join(homedir(), ".magiccap");

    // Return all promises.
    return await Promise.all([
        // Get the main commit.
        readFile(join(root, "main_commit")).then(x => x.toString()),
    
        // Get the config commit.
        readFile(join(root, "config_commit")).then(x => x.toString()),

        // Get the uploaders commit.
        readFile(join(root, "uploaders_kernel_commit")).then(x => x.toString()),

        // Get the editors commit.
        readFile(join(root, "editors_commit")).then(x => x.toString()),

        // Get the selector commit.
        readFile(join(root, "selector_commit")).then(x => x.toString()),
    ]);
};

// Ignore until the application is closed.
const tempIgnore: string[] = [];

const coreUpdate = async (blob: CoreBlob): Promise<boolean> => {
    if (process.platform !== "darwin") {
        // Linux users can't update the core, so the package manager should do this.
        // Not nulling this means that this part of the request was malformed.
        return false;
    }

    // Check if we should ignore this update.
    const ignoredUpdates = database.getConfig("ignored_updates") as string[] | undefined;
    if (tempIgnore.includes(blob.commitHash) || (ignoredUpdates && ignoredUpdates.includes(blob.commitHash))) return false;

    // Try and traverse to the root of the app.
    let appRootSplit = __MAGICCAP_DIST_FOLDER__.split(sep);
    for (;;) {
        // Pop the last root item.
        const last = appRootSplit.pop();
        if (!last) break;

        // If it ends with app, push and break.
        if (last.match(/\.app$/)) {
            appRootSplit.push(last);
            break;
        }
    }
    if (!appRootSplit.length) return false;
    const appSplit = appRootSplit.join(sep);

    // Check if we can perform the update unattended.
    let unattended = false;
    try {
        await access(appSplit, constants.W_OK | constants.R_OK);
        unattended = true;
    } catch (_) {
        // Ignore this error.
    }

    // If we can't perform the update unattended, ask the user.
    if (!unattended) {
        const resp = await dialog.showMessageBox({
            type: "question",
            title: "MagicCap",
            message: "MagicCap's core application bundle requires an update, " +
                "but MagicCap does not have permission. Would you like to " +
                "update MagicCap now? Note that you may not be able to get " +
                "future updates without this being up to date.",
            buttons: ["Yes", "Not right now", "Don't ask again"],
        });
        switch (resp.response) {
            case 1: {
                // Ignore temporarily
                tempIgnore.push(blob.commitHash);
                return false;
            }
            case 2: {
                // Ignore forever
                const a = ignoredUpdates || [];
                a.push(blob.commitHash);
                database.setConfig("ignored_updates", a);
                return false;
            }
        }
    }

    // Call the promise to open the inplace upgrader.
    if (unattended) {
        // Use a standard exec.
        await new Promise<void>((res, rej) => {
            exec(`${__MAGICCAP_DIST_FOLDER__}/inplace_upgrade "${blob.cdnUrl}"  "${appSplit}"`, err => {
                if (err) {
                    rej(err);
                    return;
                }
                res();
            });
        });
    } else {
        // Use a sudo exec.
        await new Promise<void>((res, rej) => {
            sudo.exec(`${__MAGICCAP_DIST_FOLDER__}/inplace_upgrade "${blob.cdnUrl}" "${appSplit}"`, err => {
                if (err) {
                    rej(err);
                    return;
                }
                res();
            });
        });
    }
    return true;
};

// Defines the timeout id.
let timeoutId: NodeJS.Timeout | null = null;

// Handles unloading the updater.
export const killAutoupdate = () => {
    // Clear the timeout.
    if (timeoutId) clearTimeout(timeoutId);
};

// Handle the config callback.
let updateCallback: () => Promise<void>;
updateCallback = async () => {
    // Log we are going to try and update.
    console.log("Running update poll");

    // Nullify the timeout ID.
    timeoutId = null;

    // Get the update bits.
    const updateBits = database.getConfig("update_bits") as number | undefined;
    if (updateBits === undefined || (updateBits & 1) === 0) {
        // Update bit not set. It's okay to call setTimeout here since the only thing reloading main is updates.
        timeoutId = setTimeout(updateCallback, 180000);
        return;
    }

    // Make the URL.
    const url = new URL("https://api.magiccap.org/v1/updates/poll");
    const [mainCommit, configCommit, uploadersCommit, editorsCommit, selectorCommit] = await getCommits();
    url.searchParams.append("platform", process.platform);
    url.searchParams.append("main_commit", mainCommit);
    url.searchParams.append("config_commit", configCommit);
    url.searchParams.append("uploaders_commit", uploadersCommit);
    url.searchParams.append("editors_commit", editorsCommit);
    url.searchParams.append("selector_commit", selectorCommit);
    url.searchParams.append("core_commit", commitHash);
    url.searchParams.append("update_bits", updateBits.toString());

    let resp: Response | null = null;
    try {
        // Use fetch to get the response.
        resp = await fetch(url.toString());
        if (!resp.ok) throw new Error();
    } catch (_) {
        // Make sure the response is null.
        resp = null;
    }

    // Handle the response.
    if (resp) {
        // Get the data as the response type.
        const data = await resp.json() as UpdateAPIResponse;

        // Handle core updates as a priority.
        if (data.core) {
            if (await coreUpdate(data.core)) {
                // We have been told that we should return.
                return;
            }
        }

        // Handle config updates.
        if (data.config) await doConfigUpdate(data.config);

        // Handle selector updates.
        if (data.selector) await doSelectorUpdate(data.selector);

        // Handle uploaders updates.
        if (data.uploaders) await doUploadersUpdate(data.uploaders);

        // Handle editors updates.
        if (data.editors) await doEditorsUpdate(data.editors);

        // Handle updates to main. This is a bit special since we need to kill the app from under ourselves.
        if (data.main) {
            // Write the files.
            const root = join(homedir(), ".magiccap");
            const buf = Buffer.from(data.main.encodedBlob, "base64");
            const uploadersPath = join(root, "main.js");
            await writeFile(uploadersPath, buf);
            await writeFile(join(root, "main.js.map"), Buffer.from(data.main.encodedMapBlob, "base64"));
            await writeFile(join(root, "main_commit"), data.main.commitHash);        

            // Trigger the reload and return to stop ghost updaters.
            __MAGICCAP_RELOAD_MAIN__();
            return;
        }
    }

    // Create the 3 min timeout.
    timeoutId = setTimeout(updateCallback, 180000);
};

// Creates the loop which manages auto-updates.
export default async () => {
    // Handle the MAGICCAP_NO_AUTOUPDATE environment variable.
    if (process.env.MAGICCAP_NO_AUTOUPDATE === "1") return;

    // Get the initial update bits.
    const updateBitsAny = database.getConfig("update_bits");
    if (updateBitsAny === undefined) {
        // Ask the user if we should allow auto-updates.
        await app.whenReady();
        const resp = await dialog.showMessageBox({
            type: "question",
            title: "MagicCap",
            message: "Would you like MagicCap to periodically check for updates?",
            buttons: ["Yes", "No"],
        });
        database.setConfig("update_bits", resp.response === 0 ? 1 : 0);
    }

    // Await the update callback.
    await updateCallback();
};
