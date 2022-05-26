const { makeUniversalApp } = require("@electron/universal");
const { rmdirSync } = require("fs");
const { resolve } = require("path");

process.on("unhandledRejection", err => {
    console.error(err.stack || err);
    process.exit(1);
});

makeUniversalApp({
    x64AppPath: resolve("bundles/MagicCap-darwin-x64/MagicCap.app"),
    arm64AppPath: resolve("bundles/MagicCap-darwin-arm64/MagicCap.app"),
    outAppPath: resolve("bundles/MagicCap.app"),
    copyUniqueMachO: true,
}).then(() => {
    rmdirSync("bundles/MagicCap-darwin-x64", {recursive: true});
    rmdirSync("bundles/MagicCap-darwin-arm64", {recursive: true});
});
