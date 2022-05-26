module.exports = Object.assign({}, require("./webpack.common.js"), {
    entry: "./uploaders/index.ts",
    output: {
        filename: "uploaders.js",
        library: {
            type: "commonjs",
        },
    },
});
