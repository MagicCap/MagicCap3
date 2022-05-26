module.exports = Object.assign({}, require("./webpack.common.js"), {
    entry: "./editors/index.ts",
    output: {
        filename: "editors.js",
        library: {
            type: "commonjs",
        },
    },
});
