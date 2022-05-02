"use strict";

// Required for most pathways.
const { statSync, readdirSync, readFileSync, mkdirSync } = require("fs");

// Hashes a directory and its dependencies.
function hashDirectoryAndDeps(dir) {
    const crypto = require("crypto");
    const tree = {};
    const hash = crypto.createHash("sha256");
    const hashPath = (tree, dir) => {
        const files = readdirSync(dir);
        files.forEach(file => {
            const fullPath = `${dir}/${file}`;
            const stats = statSync(fullPath);
            if (stats.isDirectory()) {
                tree[file] = {};
                hashPath(tree[file], fullPath);
            } else {
                hash.update(readFileSync(fullPath));
                tree[file] = null;
            }
        });
    };
    hashPath(tree, __dirname + "/" + dir);
    hash.update(JSON.stringify(tree));
    hash.update(JSON.stringify(readFileSync(`${__dirname}/package.json`)));
    hash.update(JSON.stringify(readFileSync(`${__dirname}/yarn.lock`)));
    hash.update(JSON.stringify(readFileSync(`${__dirname}/webpacks/webpack.common.js`)));
    hash.update(JSON.stringify(readFileSync(`${__dirname}/webpacks/webpack.${dir}.js`)));
    hash.update(process.env.WEBPACK_ENV);
    console.log("🔑 Hashed directory and dependencies of module", dir);
    return hash.digest("hex");
}

// Handle checking the cache and copying it if it exists.
function checkCache(moduleName, hash) {
    // Get the modules webpacker path.
    const { homedir } = require("os");
    const modulePath = `${homedir()}/.magiccap-dev/webpack_cache/${moduleName}`;

    // Check if the module is cached.
    let hashEqual = false;
    try {
        hashEqual = hash === readFileSync(modulePath + "/.module_hash").toString();
    } catch (_) {
        // Could not access hash.
    }
    if (!hashEqual) return;

    // Require everything needed for copy.
    const { copyFileSync, mkdirSync } = require("fs");
    mkdirSync(`${__dirname}/dist`, {recursive: true});
    const files = readdirSync(modulePath);
    for (const file of files) {
        // Copy the cached file.
        if (file !== ".module_hash") copyFileSync(`${modulePath}/${file}`, `${__dirname}/dist/${file}`);
    }

    // Log that we are using the cache.
    console.log("💾 Using cached version of", moduleName);

    // Return true when successful.
    return true;
}

// Handle the actual webpacking of a module.
function webpackModule(moduleName) {
    // Hash the module.
    const hash = hashDirectoryAndDeps(moduleName);

    // Check if there's a cached copy of this module.
    if (checkCache(moduleName, hash)) return;

    // Require the webpack config.
    const webpackConfig = require(`${__dirname}/webpacks/webpack.${moduleName}.js`);
    const { mkdtempSync, rmSync, writeFileSync, copyFileSync } = require("fs");
    const { tmpdir, homedir } = require("os");
    const webpack = require("webpack");
    const fp = mkdtempSync(tmpdir() + `/${moduleName}_${hash}`);
    try {
        webpackConfig.output.path = fp;
        webpack(webpackConfig, (err, stats) => {
            try {
                // Log the result.
                if (stats) console.log(stats.toString({
                    chunks: false,
                    colors: true
                }));

                // Error and return status code 1 if stats has errors.
                if (stats) {
                    if (stats.hasErrors()) {
                        console.log("💥 Webpacker for", moduleName, "failed!");
                        process.exit(1);
                    }
                } else if (err) {
                    console.error(err);
                    console.log("💥 Webpacker for", moduleName, "failed!");
                    process.exit(1);
                }

                // Remove and remake the cache directory if it exists.
                const moduleCachePath = `${homedir()}/.magiccap-dev/webpack_cache/${moduleName}`;
                try {
                    rmSync(moduleCachePath, {recursive: true, force: true});
                } catch (_) {
                    // No folder there.
                }
                mkdirSync(moduleCachePath, {recursive: true});

                // Copy the files to the cache directory.
                const files = readdirSync(fp);
                for (const file of files) {
                    copyFileSync(`${fp}/${file}`, `${moduleCachePath}/${file}`);
                }

                // Write the hash to the cache directory.
                writeFileSync(`${moduleCachePath}/.module_hash`, hash);

                // Make sure the dist directory exists.
                mkdirSync(`${__dirname}/dist`, {recursive: true});

                // Copy the files to the dist directory.
                for (const file of files) {
                    copyFileSync(`${fp}/${file}`, `${__dirname}/dist/${file}`);
                }

                // Log that we were done.
                console.log("🛠  Webpacker for", moduleName, "compiled successfully!");
            } finally {
                // At the end of everything, make sure to clean up.
                rmSync(fp, {recursive: true, force: true});
            }
        });
    } catch (e) {
        // In the event of error, make sure to remove the temp directory.
        rmSync(fp, {recursive: true, force: true});
        throw e;
    }
}

// Get all webpacked modules.
function getModules() {
    const files = readdirSync(`${__dirname}/webpacks`);
    const modules = [];
    files.forEach(filename => {
        const m = filename.match(/^webpack\.(.+)\.js$/);
        if (!m) return;
        if (m[1] !== "common") modules.push(m[1]);
    });
    return modules;
}

// Handle watching all modules for changes. The function specified is called when dist is changed.
// 2 arguments are given to the function. The boolean ok and the changed module.
exports.watch = function(fn) {
    const chokidar = require("chokidar");
    const { fork } = require("child_process");
    const modules = getModules();
    modules.forEach(moduleName => {
        const watcher = chokidar.watch(`${__dirname}/${moduleName}`, {persistent: false});
        watcher.on("change", () => {
            console.log("⚙ Detected change in", moduleName);
            const env = Object.assign({}, process.env);
            env.WEBPACK_TARGET = moduleName;
            const f = fork(__filename, {env});
            f.on("exit", code => fn(code === 0, moduleName));
        });
    });
    console.log("👀 Watching modules:", modules.join(", "));
};

// Handle the main entrypoint from the command line.
function main() {
    // Get all modules.
    const modules = getModules();

    // Handle if a specific target is set.
    const moduleEnv = process.env.WEBPACK_TARGET;
    if (moduleEnv) {
        // In this situation, webpack this specific module.
        return webpackModule(moduleEnv);
    }

    // Spawn a process for each possible module.
    console.log("🚀 Starting webpacker for modules:", modules.join(", "));
    const { fork } = require("child_process");
    const modulePromises = modules.map(moduleName => new Promise(res => {
        const env = Object.assign({}, process.env);
        env.WEBPACK_TARGET = moduleName;
        const f = fork(__filename, {env});
        f.on("exit", code => res(code === 0));
    }));

    // Wait for them all to be done.
    (async () => {
        // Go through them one by one until all are done.
        let success = true;
        for (const promise of modulePromises) {
            const result = await promise;
            if (!result) success = false;
        }

        // Return the result.
        if (success) console.log("🎉 All modules webpacked successfully!");
        else console.log("💥 One or more webpackers failed!");
        process.exit(success ? 0 : 1);
    })();
}

// If this is being invoked directly, call the main function.
if (require.main === module) main();
