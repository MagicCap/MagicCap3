import filenameHn from "./filename";
import database, { CaptureResult } from "./database";
import { uploaders } from "./uploaders";
import { app, clipboard, dialog, nativeImage, shell, Notification } from "electron";
import { join } from "path";
import { mkdir, writeFile } from "fs/promises";
import buildConfigIsolate from "./build_config_isolate";

// Handle post capture writing.
const doPostCaptureWrites = (filename: string, buf: Buffer, res: CaptureResult) => {
    // Handle promises in parallel for uploading and saving.
    return Promise.all([
        // Saving
        (async() => {
            // Check if we should even save.
            let shouldSave = database.getConfig("save_capture");
            if (shouldSave !== undefined && !shouldSave) {
                // Do not continue with this promise.
                return;
            }

            // Get the save path.
            let savePathAnyJson = database.getConfig("save_path");
            if (savePathAnyJson === undefined) {
                // If the save path is undefined, we should find the users pictures folder and append "MagicCap" to it.
                savePathAnyJson = join(app.getPath("pictures"), "MagicCap");
            }
            const savePath = `${savePathAnyJson}`;

            // Ensure the save path exists.
            await mkdir(savePath, {recursive: true});

            // Write the file.
            const fp = join(savePath, filename);
            await writeFile(fp, buf);

            // Set the file path.
            res.filePath = fp;
        })(),

        // Uploading
        (async() => {
            // Check if we should even upload.
            let shouldUpload = database.getConfig("upload_capture");
            if (shouldUpload !== undefined && !shouldUpload) {
                // Do not continue with this promise.
                return;
            }

            // Get the uploader ID.
            let uploaderIdAnyJson = database.getConfig("uploader_type");
            if (uploaderIdAnyJson === undefined) {
                // We assume imgur here if it is not set.
                uploaderIdAnyJson = "imgur";
            }
            const uploaderId = `${uploaderIdAnyJson}`;

            // Find the uploader.
            const uploader = uploaders.get(uploaderId);
            if (!uploader) {
                // The uploader ID is no longer valid for some reason.
                throw new Error("The uploader ID you have as default no longer exists.");
            }

            // Get the isolated part of the config.
            const configIsolate = buildConfigIsolate(uploader);

            // Call the uploader.
            res.url = await uploader.upload(configIsolate, buf, filename);
        })(),
    ]);
};

// Handle events post capture (such as saving and uploading).
export default async (ext: string, successMessage: string, buf: Buffer) => {
    // Get the filename.
    const filename = `${filenameHn.newFilename()}.${ext}`;

    // Do the post capture flow.
    const res = new CaptureResult(filename);
    let success = false;
    try {
        // Call the function to handle most of the post-capture flow.
        await doPostCaptureWrites(filename, buf, res);

        // Mark as successful.
        success = true;
    } catch (e) {
        // Something went wrong with the capture. Throw a message.
        console.error(e);
        dialog.showErrorBox("Post-Capture Actions Failed", `${e}`);
    }

    // Write the capture result.
    res.write();

    // Handle success notifications.
    if (success) {
        // Handle the cilpboard.
        switch (database.getConfig("clipboard_action")) {
        case undefined:
        case 2:
            if (!res.url) throw new Error("URL not found to put into the clipboard.");
            clipboard.writeText(res.url);
            break;
        case 0:
            // do nothing
            break;
        case 1:
            clipboard.writeImage(nativeImage.createFromBuffer(buf));
            break;
        default:
            throw new Error("Unknown clipboard action.");
        }

        // Handle if we should open the upload.
        if (res.url && database.getConfig("upload_open")) shell.openExternal(res.url);

        // Create the notification object.
        const notification = new Notification({
            title: "MagicCap",
            body: successMessage,
        });
        if (res.url && res.filePath) {
            // If there is a file path and URL, we should add multiple actions to the notification.
            notification.actions = [
                {
                    type: "button",
                    text: "Open URL",
                },
                {
                    type: "button",
                    text: "Open File",
                },
            ];
        }

        // Handle events.
        notification.on("click", () => {
            if (res.url) shell.openExternal(res.url);
            else shell.openPath(res.filePath!);
        });
        notification.on("action", (_, index: number) => {
            if (index === 0) shell.openExternal(res.url!);
            else shell.openPath(res.filePath!);
        });

        // Send the notification. The timeout is intentional to stop KDE breaking.
        // I have no clue why this fixes KDE.
        setTimeout(() => notification.show(), 30);
    }
};
