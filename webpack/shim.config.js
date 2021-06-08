const webpack = require("webpack");
const ATL = require("awesome-typescript-loader");
const TerserPlugin = require("terser-webpack-plugin");

process.env.NODE_ENV = "production";

const config = {
    entry: "./src/shim/index.ts",
    output: {
        filename: "./shim/ironweb.min.js",
        libraryTarget: "umd",
        library: "ironweb",
    },
    mode: "production",
    resolve: {
        modules: ["node_modules"],
        extensions: [".ts", ".js"],
    },
    devtool: "source-map",
    optimization: {
        minimizer: [new TerserPlugin()],
    },
    module: {
        rules: [
            {
                test: /\.ts$/,
                use: ["awesome-typescript-loader"],
                exclude: /node_modules/,
            },
        ],
    },
    plugins: [
        new ATL.CheckerPlugin(),
        new webpack.DefinePlugin({
            NODE_ENV: JSON.stringify("production"),
            "process.env.NODE_ENV": JSON.stringify("production"),
        }),
    ],
};

module.exports = config;
