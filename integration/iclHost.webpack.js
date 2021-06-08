const path = require("path");
const fs = require("fs");
const webpack = require("webpack");

const IRONCORE_HOST = "dev1.ironcorelabs.com";
const IRONCORE_PORT = 4501;

/**
 * Serve HTML for frame. Contains shell of a page, but includes necessary frame JS which will then pull down web worker source
 */
function serveFrame(req, res) {
    const scripts = [];
    if (process.env.NODE_ENV === "production") {
        scripts.push("/static/ironweb-frame-version/ironweb-frame.min.js");
    } else {
        scripts.push("/webpack/dist/frame.js");
    }

    res.type("text/html");
    res.status(200).send(
        `<!DOCTYPE html><html lang="en">
        <head>
            <meta charset="utf-8">
            <title>IronWeb SDK Frame</title>
        </head>
        <body>
            ${scripts.map((file) => `<script src="${file}"></script>`).join("\n")}
        </body>
        </html>`
    );
}

const sharedConfig = {
    mode: "development",
    output: {
        publicPath: `https://${IRONCORE_HOST}:${IRONCORE_PORT}/webpack/dist/`,
        //https://github.com/webpack/webpack/issues/6642
        globalObject: "this",
    },
    optimization: {
        moduleIds: "named",
        emitOnErrors: false,
        splitChunks: {
            cacheGroups: {
                defaultVendors: {
                    //By default when you use dynamic imports any other modules included in the resulting import that come from the
                    //node_modules directory are shoved into another "vendor" bundle. This means that our minimal RecryptJS shim gets
                    //separated from the actual recryptjs file. There's no reason not to combine those files, so intead we tell webpack
                    //here to never generate a vendors bundle
                    test: () => false,
                },
            },
        },
    },
    devtool: "eval-source-map",
    resolve: {
        modules: ["node_modules"],
        extensions: [".ts", ".js", ".wasm"],
        fallback: {
            crypto: false,
        },
    },
    module: {
        rules: [
            {
                test: /\.ts$/,
                exclude: /node_modules/,
                use: ["awesome-typescript-loader"],
            },
        ],
    },
    plugins: [
        new webpack.HotModuleReplacementPlugin(),
        new webpack.DefinePlugin({
            SDK_NPM_VERSION_PLACEHOLDER: JSON.stringify("SDK_NPM_VERSION_PLACEHOLDER"),
            _WORKER_PATH_LOCATION_: JSON.stringify("./webpack/dist/worker.js"),
        }),
    ],
    experiments: {
        asyncWebAssembly: true,
    },
};

const frameConfig = {
    ...sharedConfig,
    devServer: {
        hot: true,
        compress: true,
        port: IRONCORE_PORT,
        host: IRONCORE_HOST,
        overlay: true,
        https: {
            key: fs.readFileSync(path.join(__dirname, "certs/icl/privkey.pem")),
            cert: fs.readFileSync(path.join(__dirname, "certs/icl/cert.pem")),
            ca: fs.readFileSync(path.join(__dirname, "certs/icl/chain.pem")),
        },
        before(app) {
            app.get("/ironweb-frame", serveFrame);
            //Setup endpoint for optionally serving production files for both the frame and the worker script. The path here is defined
            //both above in the frame HTMl as well as the build config in build.js for when we define the webpack public path for the worker.
            app.use("/static/:version/:file", (req, res) => {
                res.sendFile(path.join(__dirname, "../dist/frame/", req.params.file));
            });
        },
        proxy: {
            //Proxy through API requests through webpack. We're doing this because the API is hosted locally over port 9090 over
            //HTTP, but since we're running local dev over https those requests will fail. So we proxy here so everything on the
            //client is over HTTPS. This also makes the environment setup closer to production since the API is on the same
            //server as the frame source is hosted from
            "/api/1/": "http://localhost:9090",
        },
    },
    entry: {
        frame: path.join(__dirname, "../src/frame/index.ts"),
    },
};

const workerConfig = {
    ...sharedConfig,
    target: "webworker",
    entry: {
        worker: [path.join(__dirname, "../src/frame/worker/index.ts")],
    },
};

module.exports = [frameConfig, workerConfig];
