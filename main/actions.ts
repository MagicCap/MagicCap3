import selector from "./selector";
import gif from "./gif_controller";
import database, { CaptureResult } from "./database";
import postCapture from "./post_capture";
import multiDisplayCaptureBuffer from "./multi_display_capture";
import config from "./config";
import { getEditors } from "./editors";
import { uploaders } from "./uploaders";
import { ToolboxItem } from "../sharedTypes";
import { join, basename } from "path";
import { clipboard, dialog, shell, Notification } from "electron";
import { readFile } from "fs/promises";
import buildConfigIsolate from "./build_config_isolate";

// Defines the promise for the crosshair.
const crosshairPromise = readFile(join(__MAGICCAP_DIST_FOLDER__, "..", "assets", "crosshair.png")).then(buf => buf.toString("base64"));

// Used to open the region selector.
export const openRegionSelector = async () => {
    // Get the result from the selector.
    const result = await selector.use({
        returnRegion: true,
        toolboxItems: [{
            icon: await crosshairPromise,
            id: "__selector",
        } as ToolboxItem, ...getEditors().map(x => {
            const item: ToolboxItem = {
                description: x.description,
                icon: x.icon.toString("base64"),
                id: x.id,
            };
            return item;
        }) as ToolboxItem[]],
    });

    // Check if it was cancelled.
    if (!result) return;

    // Jump to the post capture flow.
    return await postCapture("png", "Region capture successful", result.selection!);
};

// Used to perform a GIF capture.
export const gifCapture = async () => {
    // Get the result from the selector.
    const result = await selector.use({
        returnRegion: false,
        toolboxItems: [],
    });

    // Check if it was cancelled.
    if (!result) return;

    // Start the GIF encoder.
    const buf = await gif(result.actualPosition.left,
        result.actualPosition.top, result.actualPosition.width,
        result.actualPosition.height);

    if (buf === null) {
        // The only situation this can happen is if the cancel function is called.
        return;
    }

    // Jump to the post capture flow.
    return await postCapture("gif", "GIF capture successful", buf);
};

// Used to perform a clipboard capture.
export const clipboardCapture = async () => {
    // Attempt to fetch the native image from the clipboard.
    const image = clipboard.readImage();

    // Handle empty clipboard errors.
    if (image.isEmpty()) throw new Error("The clipboard does not contain an image");

    // Get the result from the selector.
    return await postCapture("png", "Clipboard capture successful", image.toPNG());
};

// Used to perform a multi-display capture.
export const multiDisplayCapture = async () => {
    return await postCapture("png", "Multi-display capture successful",
        await multiDisplayCaptureBuffer());
};

// Used to open the config or focus it if it is already open.
export const openConfig = async () => config();

// Used to handle uploading a file to a specific uploader.
export const uploadTo = async (uploaderId: string) => {
    // Get the uploader.
    const uploader = uploaders.get(uploaderId);
    if (!uploader) throw new Error("Uploader not found");

    // Get the isolated part of the config.
    const configIsolate = buildConfigIsolate(uploader);

    // Open the dialog box.
    const ret = await dialog.showOpenDialog({
        title: "Select a file...",
        properties: ["openFile", "multiSelections"],
    });

    // Run the upload function.
    if (ret.filePaths.length > 0) {
        for (const fp of ret.filePaths) {
            // Get the information to start.
            const buf = await readFile(fp);
            const res = new CaptureResult(basename(fp));
            res.filePath = fp;

            // Do the post capture flow.
            let success = false;
            try {
                // Call the function to do the uplaod.
                res.url = await uploader.upload(configIsolate, buf, res.filename);

                // Mark as successful.
                success = true;
            } catch (e) {
                // Something went wrong with the upload. Throw a message.
                dialog.showErrorBox("Upload Failed", `${e}`);
            }

            // Write the capture result.
            res.write();

            // Handle success notifications.
            if (success) {
                // Handle the cilpboard.
                clipboard.writeText(res.url!);

                // Handle if we should open the upload.
                if (database.getConfig("upload_open")) shell.openExternal(res.url!);

                // Create the notification object.
                const notification = new Notification({
                    title: "MagicCap",
                    body: `Succesfully uploaded file to ${uploader.name}.`,
                    urgency: "critical",
                });

                // Handle clicks.
                notification.on("click", () => shell.openExternal(res.url!));

                // Send the notification. The timeout is intentional to stop KDE breaking.
                // I have no clue why this fixes KDE.
                setTimeout(() => notification.show(), 30);
            }
        }
    }
};
