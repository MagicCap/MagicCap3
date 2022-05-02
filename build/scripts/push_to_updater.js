"use strict";

// The purpose of this script is to push the build of MagicCap to api.magiccap.org.
// This is better than the MySQL way I was intending to use initially since this means we
// can use a Cloudflare Worker and also means we can avoid a super ugly SQL query and hashing
// in the build pipeline for the most part (with the excepton of core which is handled below).

const fetch = require("node-fetch");
const FormData = require("form-data");
const { readFileSync, statSync, readdirSync } = require("fs");

// Check the env vars.
const commitHash = process.env.COMMIT_HASH;
const darwinCdnUrl = process.env.DARWIN_CDN_URL;
const apiKey = process.env.API_KEY;
if (!darwinCdnUrl || !commitHash || !apiKey) {
    throw new Error("Missing env vars.");
}
const updateType = process.env.UPDATE_TYPE;
if (!["stable", "beta", "alpha"].includes(updateType)) {
    throw new Error("The UPDATE_TYPE env var must be one of 'stable', 'beta', or 'alpha'.");
}

// Get all of the static files.
const files = {};
[
    // Map files.
    "./dist/config.js.map", "./dist/editors.js.map", "./dist/main.js.map",
    "./dist/selector.js.map", "./dist/uploaders.js.map",

    // JS files
    "./dist/config.js", "./dist/editors.js", "./dist/main.js",
    "./dist/selector.js", "./dist/uploaders.js",
].forEach(fp => {
    // Get the filename.
    const filename = fp.split("/").pop();

    // Read the file.
    files[filename] = readFileSync(fp);
});

// Handles hashing the specified folder or file.
function hashContents(hash, fp) {
    const s = statSync(fp);
    if (s.isDirectory()) {
        readdirSync(fp).sort().forEach(f => hashContents(hash, `${fp}/${f}`));
    } else {
        hash.update(fp);
        hash.update(readFileSync(fp));
    }
}

// Do a bit of magic here to generate the core hash. This is because it
// is difficult to get a hash of one file to prove that core has changed without
// causing a bunch of collateral updates.
function generateCoreHash() {
    // Open the package.json.
    const package = require(`${__dirname}/package.json`);

    // Create a hashing context.
    const hash = require("crypto").createHash("sha256");

    // Flat map the dependencies in a sorted order.
    Object.keys(package.dependencies).sort().forEach(key => {
        const value = JSON.stringify(package.dependencies[key]);
        hash.update(key);
        hash.update(value);
    });

    // Add the electron version to the hash.
    hash.update(package.devDependencies.electron);

    // Hash all other relevant folders.
    hashContents(hash, "./assets");
    hashContents(hash, "./gif");
    hashContents(hash, "./inplace_upgrade");
    hashContents(hash, "./libnotch");
    hashContents(hash, "./libscreenshot");
    hashContents(hash, "./sftp");

    // Return the hash.
    return hash.digest("base64");
}
const coreHash = generateCoreHash();

// Create the form.
const form = new FormData();
Object.keys(files).forEach(key => {
    form.append(key, files[key], {
        contentType: "application/octet-stream",
    });
})
form.append("metadata", JSON.stringify({
    darwinCdnUrl, commitHash, coreHash, updateType,
}), {contentType: "application/json"});

// Do the POST request.
fetch("https://api.magiccap.org/v1/updates/push", {
    method: "POST",
    body: form,
    headers: form.getHeaders({"Authorization": `Bearer ${apiKey}`}),
}).then(x => {
    if (!x.ok) throw new Error(`Failed to push to the updater (status code ${x.status}).`);
}).catch(err => {
    console.error(err);
    process.exit(1);
});
