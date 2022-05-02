// This code is a part of MagicCap which is a MPL-2.0 licensed project.
// Copyright (C) Jake Gealer <jake@gealer.email> 2019-2021.

import { globalShortcut, dialog } from "electron";
import { openRegionSelector, gifCapture, clipboardCapture, multiDisplayCapture } from "./actions";
import database from "./database";

// Block hotkeys during selection.
let hotkeyBlock = false;

// Function to impose hotkey block.
export const blockHotkeys = () => {
    globalShortcut.unregisterAll();
    hotkeyBlock = true;
};

// Handles hotkey management.
const register = () => {
    globalShortcut.unregisterAll();

    try {
        const hotkey = database.getConfig("hotkey");
        if (hotkey) {
            globalShortcut.register(`${hotkey}`, () => {
                if (hotkeyBlock) return;
                console.log("Capture hotkey used.");
                openRegionSelector();
            });
        }
    } catch (_) {
        dialog.showErrorBox("MagicCap", "The capture hotkey you gave was invalid.");
    }

    try {
        const hotkey = database.getConfig("gif_hotkey");
        if (hotkey) {
            globalShortcut.register(`${hotkey}`, () => {
                if (hotkeyBlock) return;
                console.log("GIF hotkey used.");
                gifCapture();
            });
        }
    } catch (_) {
        dialog.showErrorBox("MagicCap", "The GIF hotkey you gave was invalid.");
    }

    try {
        const hotkey = database.getConfig("clipboard_hotkey");
        if (hotkey) {
            globalShortcut.register(`${hotkey}`, () => {
                if (hotkeyBlock) return;
                console.log("Clipboard hotkey used.");
                clipboardCapture();
            });
        }
    } catch (_) {
        dialog.showErrorBox("MagicCap", "The clipboard hotkey you gave was invalid.");
    }

    try {
        const hotkey = database.getConfig("multi_display_hotkey");
        if (hotkey) {
            globalShortcut.register(`${hotkey}`, () => {
                if (hotkeyBlock) return;
                console.log("Multi display hotkey used.");
                multiDisplayCapture();
            });
        }
    } catch (_) {
        dialog.showErrorBox("MagicCap", "The multi display hotkey you gave was invalid.");
    }
};

// Function to remove hotkey block.
export const unblockHotkeys = () => {
    register();
    hotkeyBlock = false;
};

export default register;
