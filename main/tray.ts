import database from "./database";
import { uploaders } from "./uploaders";
import { multiDisplayCapture, gifCapture, clipboardCapture, openRegionSelector, openConfig, uploadTo } from "./actions";
import { Tray, Menu, MenuItemConstructorOptions } from "electron";
import { join } from "path";
import { Uploader } from "../sharedTypes";

let tray: Tray | undefined;

const acceleratorIfSet = (key: string) => {
    const res = database.getConfig(key);
    return typeof res === "string" ? {accelerator: res} : {};
};

const processUploadTo = (): MenuItemConstructorOptions[] => {
    // Get all configured uploaders.
    const configuredUploaders: {uploader: Uploader; id: string}[] = [];
    uploaders.forEach((uploader, id) => {
        // Check the values exist.
        for (const option of uploader.options) {
            const res = database.getConfig(option.key);
            if (res === undefined && option.required && option.default === undefined) {
                // This uploader has options missing.
                return;
            }
        }

        // Append the option.
        configuredUploaders.push({uploader, id});
    });

    // If there's no items, return a empty list.
    if (configuredUploaders.length === 0) return [];

    // Sort the uploaders.
    const default_ = database.getConfig("uploader_type");
    configuredUploaders.sort((a, b) => {
        if (a.id === default_) {
            // This should always be first.
            return -1;
        }

        return a.uploader.name.localeCompare(b.uploader.name);
    });

    // Return the menu items.
    return [
        {type: "separator"},
        {
            type: "submenu",
            label: "Upload To...",
            submenu: configuredUploaders.map(x => {
                let name = `Upload to ${x.uploader.name}`;
                if (x.id === default_) name += " (Default)";
                return {
                    type: "normal",
                    label: name,
                    click: () => uploadTo(x.id),
                } as MenuItemConstructorOptions;
            }),
        },
    ];
};

export const remakeMenu = () => {
    // Return if the tray doesn't exist.
    if (!tray) return;

    // Create the menu.
    const menu = Menu.buildFromTemplate([
        {label: "Region Capture", type: "normal", click: openRegionSelector, ...acceleratorIfSet("hotkey")},
        {label: "Multi Display Capture", type: "normal", click: multiDisplayCapture, ...acceleratorIfSet("multi_display_hotkey")},
        {label: "GIF Capture", type: "normal", click: gifCapture, ...acceleratorIfSet("gif_hotkey")},
        {label: "Clipboard Capture", type: "normal", click: clipboardCapture, ...acceleratorIfSet("clipboard_hotkey")},

        ...processUploadTo(),

        {type: "separator"},

        {label: "Captures/Config", type: "normal", click: openConfig},
        {label: "Quit", type: "normal", click: () => process.exit(0)},
    ]);

    // Set the context menu.
    tray.setContextMenu(menu);
};

export const killTray = () => {
    if (tray) {
        // @ts-ignore
        globalThis.__MAGICCAP_LAST_TRAY__ = tray;
        tray = undefined;
    }
};

export default () => {
    if (!tray) {
        // Check if it was cached from the last boot.
        // @ts-ignore
        if (globalThis.__MAGICCAP_LAST_TRAY__) tray = globalThis.__MAGICCAP_LAST_TRAY__;

        // If not, create it.
        else tray = new Tray(join(__MAGICCAP_DIST_FOLDER__, "..", "assets", "taskbar.png"));
    }
    remakeMenu();
};
