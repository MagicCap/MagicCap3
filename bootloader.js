"use strict";

const crypto = require("crypto");
const { join } = require("path");
const { homedir } = require("os");
const { writeFileSync, readFileSync, mkdirSync, copyFileSync, promises } = require("fs");
const { readFile } = promises;
const { app } = require("electron");

// If this is Linux, globally hook iohook.
if (process.platform === "linux") {
    const iohook = globalThis.iohook = require("iohook");
    process.on("exit", () => iohook.unload());
}

// Setup some globals which are known by our webpack config to counteract weird path issues.
globalThis.Sharp = require("sharp");
globalThis.BetterSQLite3 = require("better-sqlite3");

// Ignore when all the windows are closed.
app.on("window-all-closed", () => {});

// Set where the magiccap dist folder is for in the main application.
globalThis.__MAGICCAP_DIST_FOLDER__ = join(__dirname, "dist");

// Defines the path for .magiccap.
const root = join(homedir(), ".magiccap");

// Get the local commit hash.
const commitHash = readFileSync(`${__dirname}/dist/commit_hash`);

// Defines the unload event.
let unloader;

// The global function to set the unloader.
globalThis.__MAGICCAP_SET_MAIN_UNLOADER__ = f => {
    unloader = f;
};

// Handle hash comparison and the remainder of the boot afterwards.
Promise.all([
    // Hash local main.js.
    readFile(`${__dirname}/dist/main.js`).then(x => crypto.createHash("sha256").update(x).digest("hex")),

    // Get main_bundled_hash from ~/.magiccap.
    (async() => {
        const fp = join(root, "main_bundled_hash");
        try {
            // Read the file.
            return await readFile(fp).then(x => x.toString());
        } catch (_) {
            // Ignore this error.
        }
    })(),
]).then(([localBundle, lastBundle]) => {
    // Defines the main path.
    const mainPath = join(root, "main.js");

    if (localBundle !== lastBundle) {
        // In this situation, we should write our local bundle.
        console.log("Core install changed since main last edited, setting to this installs bundle");
        mkdirSync(root, {recursive: true});
        copyFileSync(`${__dirname}/dist/main.js`, mainPath);
        copyFileSync(`${__dirname}/dist/main.js.map`, join(root, "main.js.map"));
        writeFileSync(join(root, "main_commit"), commitHash);
        writeFileSync(join(root, "main_bundled_hash"), localBundle);
    }

    // Defines the loader.
    let loader;
    loader = () => {
        // Wait for the unloader then call require.
        (unloader ? unloader() : Promise.resolve()).then(() => {
            // Unset the unloader.
            unloader = undefined;

            // Clear the require cache.
            delete require.cache[require.resolve(mainPath)];

            // Require the main path.
            require(mainPath);

            // Dispatch the ready event.
            app.emit("ready");
        });
    };
    globalThis.__MAGICCAP_RELOAD_MAIN__ = loader;

    // Call the loader.
    loader();
});

// Handle hot reloading.
if (process.env.WEBPACK_ENV === "development") require("./webpacker").watch((ok, moduleName) => {
    if (ok) {
        // Handle the region selector difference.
        if (moduleName === "region_selector") moduleName = "selector";

        // Copy the file and its map to .magiccap.
        copyFileSync(`${__dirname}/dist/${moduleName}.js`, join(root, `${moduleName}.js`));
        copyFileSync(`${__dirname}/dist/${moduleName}.js.map`, join(root, `${moduleName}.js.map`));

        // Reload the application.
        globalThis.__MAGICCAP_RELOAD_MAIN__();
    }
});
