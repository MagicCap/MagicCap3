"use strict";

const { copySync, rmSync, mkdirSync, moveSync } = require("fs-extra");
const { spawn } = require("child_process");
const { resolve } = require("path");

function exec(cwd, cmd, args) {
    return new Promise((res, rej) => {
        const val = spawn(cmd, args, {cwd: resolve(cwd)});
        val.stdout.pipe(process.stdout);
        val.stderr.pipe(process.stderr);
        val.on("exit", code => {
            if (code === 0) res();
            else rej(new Error(`Process exited with code ${code}.`));
        });
    });
}

function exitCatch(err) {
    console.error(err);
    process.exit(1);
}

if (process.platform === "linux") {
    copySync("./node_modules/iohook", "./node_modules/iohook_rebuilt");
    exec("./node_modules/iohook_rebuilt", "npm", ["i"]).then(() =>
        exec(
            "./node_modules/iohook_rebuilt", "node", [
                "build.js",
                "--runtime=electron",
                "--version=17.1.0",
                "--abi=101",
                "--upload=false"
            ]
        ).then(() => {
            rmSync("./node_modules/iohook/builds", {recursive: true, force: true});
            mkdirSync(`./node_modules/iohook/builds/electron-v101-linux-${process.arch}`, {recursive: true});
            moveSync("./node_modules/iohook_rebuilt/build", `./node_modules/iohook/builds/electron-v101-linux-${process.arch}/build`);
            rmSync("./node_modules/iohook_rebuilt", {recursive: true, force: true});
        })
    ).catch(exitCatch);
}
