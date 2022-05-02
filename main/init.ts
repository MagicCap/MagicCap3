import { app } from "electron";
import { openConfig } from "./actions";
import tray from "./tray";
import selector, { selectorInit } from "./selector";
import { uploadersInit } from "./uploaders";
import { editorsInit } from "./editors";
import { configInit } from "./config";
import hotkeys from "./hotkeys";
import autoupdate from "./autoupdate";
import webServer from "./external_api_router";

// Hide in the dock.
if (app.dock) app.dock.hide();

// Handle the SFTP special case.
import "./sftp_special_case";

// Import the unload hook.
import "./unloader";

// Fix the macOS menu.
import "./menu";

if (!app.requestSingleInstanceLock()) {
    // We do not have the lock. We should exit here.
    app.exit();
    process.exit(0);
}
app.on("second-instance", openConfig);

// Set the callback when the application is loaded.
app.whenReady().then(async () => {
    // Enable a11y support.
    app.setAccessibilitySupportEnabled(true);

    // Initialize the uploaders.
    await uploadersInit();

    // Initialize the editors.
    await editorsInit();

    // Initialize the config.
    await configInit();

    // Initialize uploaders.
    await selectorInit();
    await selector.ensureInit();

    // Initialize auto-update.
    await autoupdate();

    // Load the web server.
    webServer();

    // Load the tray.
    tray();

    // Load the hotkeys.
    hotkeys();
});
