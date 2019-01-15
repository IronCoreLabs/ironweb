const webpack = require("webpack");
const path = require("path");
const ATL = require("awesome-typescript-loader");
const TerserPlugin = require("terser-webpack-plugin");

process.env.NODE_ENV = "production";

module.exports = (_, argv) => {
    //Shared Webpack config for both the frame bundle and the WebWorker bundle
    const sharedConfig = {
        mode: "production",
        //The code in our ed25519 library attempts to determine if we're running in a Node environment and tries to do a `require("crypto")`. That
        //will cause Webpack to try and polyfill the entire library with a few hundred K of crypto libraries. We don't need that, so this
        //object is used to make it so that when someone does a `require("crypto")` it just returns an empty object
        node: {
            crypto: "empty",
            process: false,
            path: false,
        },
        module: {
            rules: [
                {
                    test: /\.ts/,
                    use: ["awesome-typescript-loader"],
                    exclude: /node_modules/,
                },
            ],
        },
        resolve: {
            extensions: [".ts", ".js", ".wasm"],
            modules: ["node_modules"],
        },
        plugins: [
            new ATL.CheckerPlugin(),
            new webpack.DefinePlugin({
                NODE_ENV: JSON.stringify("production"),
                "process.env.NODE_ENV": JSON.stringify("production"),
                _WORKER_PATH_LOCATION_: JSON.stringify(`${argv.outputPublicPath}ironweb-worker.min.js`),
            }),
        ],
    };

    //Config unique to generating the frame bundle
    const frameConfig = {
        ...sharedConfig,
        entry: {
            frame: path.join(__dirname, "../src/frame/index.ts"),
        },
        optimization: {
            minimizer: [new TerserPlugin()],
        },
        output: {
            filename: "./frame/ironweb-[name].min.js",
            library: "ironweb-frame",
            libraryTarget: "umd",
            chunkFilename: "./frame/[name].min.js",
        },
    };

    //Config unique to generating the WebWorker + WebAssembly collection of bundles
    const workerConfig = {
        ...sharedConfig,
        entry: {
            worker: ["es6-promise/auto", path.join(__dirname, "../src/frame/worker/index.ts")],
        },
        output: {
            filename: "./frame/ironweb-[name].min.js",
            library: "ironweb-frame",
            libraryTarget: "umd",
            chunkFilename: "[name].min.js",
        },
        target: "webworker",
        optimization: {
            minimizer: [new TerserPlugin()],
            splitChunks: {
                cacheGroups: {
                    vendors: {
                        //By default when you use dynamic imports any other modules included in the resulting import that come from the
                        //node_modules directory are shoved into another "vendor" bundle. This means that our minimal RecryptJS shim gets
                        //separated from the actual recryptjs file. There's no reason not to combine those files, so intead we tell webpack
                        //here to never generate a vendors bundle
                        test: () => false,
                    },
                },
            },
        },
    };

    return [frameConfig, workerConfig];
};
