const webpack = require("webpack");
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
                use: ["ts-loader"],
                exclude: /node_modules/,
            },
        ],
    },
    plugins: [
        new webpack.DefinePlugin({
            "process.env.NODE_ENV": JSON.stringify("production"),
        }),
    ],
};

module.exports = config;
