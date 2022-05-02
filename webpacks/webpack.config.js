module.exports = Object.assign({}, require("./webpack.common.js"), {
    entry: "./config/index.tsx",
    target: "electron-renderer",
    output: {
        filename: "config.js",
        library: {
            type: "commonjs"
        }
    }
});
