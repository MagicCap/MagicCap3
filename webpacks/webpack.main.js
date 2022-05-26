module.exports = Object.assign({}, require("./webpack.common.js"), {
    entry: "./main/index.ts",
    output: {
        filename: "main.js",
        library: {
            type: "commonjs",
        },
    },
});
