module.exports = Object.assign({}, require("./webpack.common.js"), {
    entry: "./region_selector/index.tsx",
    output: {
        filename: "selector.js",
        library: {
            type: "commonjs"
        }
    }
});
