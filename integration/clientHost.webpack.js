const path = require("path");
const fs = require("fs");
const webpack = require("webpack");
const animalID = require("animal-id");
const cookieParser = require("cookie-parser");
const jwt = require("jsonwebtoken");
const projectIDs = require("./projects/project.json");
const keyFile = path.join(__dirname, "./projects/private.key");
const privateKey = fs.readFileSync(keyFile, "utf8");

const SB_HOST = "dev1.scrambledbits.org";
const SB_PORT = 4500;

if ((process.env.HOSTED_VERSION && !process.env.HOSTED_ENV) || (!process.env.HOSTED_VERSION && process.env.HOSTED_ENV)) {
    throw new Error("In order to run against a non-local environment you need to set both the `HOSTED_VERSION` and `HOSTED_ENV` environment variables.");
}

//Swap out the iFrame domain variable depending on which environment we want to point to. By default we point to local, otherwise if the
//HOSTED_VERSION env var is set we point to dev or stage. Production is not yet supported.
function getFrameDomain() {
    switch (process.env.HOSTED_ENV) {
        case "prod":
            return "https://api.ironcorelabs.com";
        case "stage":
            return "https://api-staging.ironcorelabs.com";
        case "dev":
            return "https://api-dev1.ironcorelabs.com";
        default:
            return "https://dev1.ironcorelabs.com:4501";
    }
}

const runtimeEnvironment = process.env.HOSTED_VERSION ? "production" : "";

/**
 * Serve the app index.html page. This figures out who the current user is, and if one doesn't exist, generates a new random user
 */
function serveIndex(req, res) {
    let userCookie = req.cookies.integrationDemo;
    try {
        userCookie = JSON.parse(userCookie);
    } catch (e) {
        const userParts = animalID.getUuid().split("-");
        const userName = `${userParts[0][0].toUpperCase() + userParts[0].slice(1)} ${userParts[1][0].toUpperCase() + userParts[1].slice(1)}`;
        const userID = userParts.slice(2).join("-");
        userCookie = {id: userID, name: userName};
    }

    const {id, name} = userCookie;

    res.type("text/html");
    res.status(200).send(
        `<!DOCTYPE html><html lang="en">
        <head>
            <meta charset="utf-8">
            <title>IronWeb SDK Demo</title>
            <style>html,body, #root{margin: 0; padding: 0; height: 100%; width: 100%}</style>
        </head>
        <body>
            <div id="root"></div>
            <script>
                var User = {id: "${id}", name: "${name}"}
            </script>
            <script src="/static/dist/main.js"></script>
        </body>
        </html>`
    );
}

/**
 * Generate a JWT for the requesting user
 */
function serveJWT(req, res) {
    res.json(
        jwt.sign({pid: projectIDs.projectId, sid: projectIDs.segmentId, kid: projectIDs.serviceKeyId || undefined}, privateKey, {
            algorithm: "ES256",
            expiresIn: "2m",
            subject: req.params.userID,
        })
    );
}

module.exports = {
    devServer: {
        hot: true,
        compress: true,
        port: SB_PORT,
        host: SB_HOST,
        overlay: true,
        https: {
            key: fs.readFileSync(path.join(__dirname, "certs/sb/privkey.pem")),
            cert: fs.readFileSync(path.join(__dirname, "certs/sb/cert.pem")),
            ca: fs.readFileSync(path.join(__dirname, "certs/sb/chain.pem")),
        },
        before(app) {
            app.use(cookieParser());
            app.get("/", serveIndex);
            app.get("/generateJWT/:userID", serveJWT);
        },
    },
    mode: "development",
    entry: [path.join(__dirname, "app.tsx")],
    output: {
        publicPath: `https://${SB_HOST}:${SB_PORT}/static/dist/`,
        filename: "[name].js",
    },
    resolve: {
        modules: ["node_modules"],
        extensions: [".ts", ".tsx", ".js"],
    },
    devtool: "eval-source-map",
    module: {
        rules: [
            {
                test: /\.tsx?$/,
                exclude: /node_modules/,
                use: ["awesome-typescript-loader"],
            },
        ],
    },
    optimization: {
        moduleIds: "named",
        emitOnErrors: false,
    },
    plugins: [
        new webpack.HotModuleReplacementPlugin(),
        new webpack.DefinePlugin({
            NODE_ENV: JSON.stringify(runtimeEnvironment),
            "process.env.NODE_ENV": JSON.stringify(runtimeEnvironment),
            SDK_NPM_VERSION_PLACEHOLDER: JSON.stringify(process.env.HOSTED_VERSION || "SDK_NPM_VERSION_PLACEHOLDER"),
            _ICL_FRAME_DOMAIN_REPLACEMENT_: JSON.stringify(getFrameDomain()),
        }),
    ],
    experiments: {
        asyncWebAssembly: true,
    },
};
