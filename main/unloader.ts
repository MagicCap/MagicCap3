import { app, globalShortcut } from "electron";
import { killTray } from "./tray";
import { killConfig } from "./config";
import { killGifs } from "./gif_controller";
import { killAutoupdate } from "./autoupdate";
import { unloadExceptionHandler } from "./exception_handler";
import database from "./database";
import selector from "./selector";

declare global {
    const __MAGICCAP_SET_MAIN_UNLOADER__: (f: () => Promise<void>) => void;
}

__MAGICCAP_SET_MAIN_UNLOADER__(async () => {
    // Unregister all hotkeys.
    globalShortcut.unregisterAll();

    // Kill the tray.
    killTray();

    // Kill the config.
    killConfig();

    // Kill auto-update.
    killAutoupdate();

    // Unload the second instance event handler.
    app.removeAllListeners("second-instance");

    // Kill any open region selectors.
    selector.kill();

    // Kill any running GIF captures.
    killGifs();

    // Close the database connection.
    database.db.close();

    // Unload the exception handler.
    unloadExceptionHandler();
});
