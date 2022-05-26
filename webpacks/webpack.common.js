module.exports = {
    mode: process.env.WEBPACK_ENV,
    devtool: 'source-map',
    target: 'electron-main',
    externals: {
        sharp: 'root Sharp',
        'better-sqlite3': 'root BetterSQLite3',
    },
    module: {
        rules: [
            {
                test: /\.tsx?$/,
                loader: 'ts-loader',
            },
            {
                test: /\.css$/,
                loader: 'css-loader',
            },
            {
                test: /\.s[ac]ss$/,
                use: ['style-loader', 'css-loader', 'sass-loader'],
            },
            {
                test: /\.(png|svg)$/,
                loader: 'buffer-loader',
            },
        ],
    },
    resolve: {
        extensions: ['.js', '.ts', '.tsx', '.jsx', '.json'],
    },
};
