// Import what is needed to make a dialog box.
import { app, dialog } from "electron";

// I can't seem to properly unload the event, so this will slightly leak.
// However, it is likely so inconsiquential that it is not a problem.
let aborted = false;

// Handles rejected promises.
const f = (err: any) => {
    const f = () => {
        if (aborted) return;
        dialog.showErrorBox("MagicCap", `${err}`);
    };
    if (app.isReady()) f();
    else app.once("ready", f);
};
process.on("unhandledRejection", f);

// Unload the event.
export const unloadExceptionHandler = () => {
    aborted = true;
};
