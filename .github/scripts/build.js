#!/usr/bin/env node

/*
 * IronWeb SDK Build File
 * ========================
 *
 * The goal of this build file is two-fold:
 *
 *  1. Produce hosted build artifacts in a ./dist folder for the two separate private NPM packages this repo represents:
 *     + The ironweb shim, which is the NPM module that customers will interact with and include as part of their projects
 *     + The ironweb frame bundle, which will be consumed from the identity service and served up to handle all API communication and crypto operations
 *
 *  2. Automatically bump the version of these two packages by a patch version as well as changing that version in the root package.json file. This is done
 *     in prep for publishing the results to private NPM packages.
 *
 * The build process is responsible for compiling our TypeScript source and producing three different build types for the ironweb shim project, CommonJS, ES, and UMD. The
 * ironweb frame project only produces UMD style builds.
 *
 *     + CommonJS: Node-style imports. For use in projects who use CommonJS style includes for their projects
 *     + ES: ES6 style imports. For use in projects who use ES import syntax for their projects
 *     + UMD: Universal module definition. Single combined/minified production builds that can be used anywhere, including in simple <script> include tags
 *
 * Once the TypeScript has been converted and output as the different build types, we then rearrange the results into a directory structure that is ideal for publishing
 * to NPM. Each of the two projects has their own package.json files within the source. However, in order to make local development and dependency management easier,
 * the dependencies and versions for each of these projects are defined at the top level package.json script. So during build time here, we move the version and dependency
 * lists from that file into the appropriate project package.json file.
 *
 * After that is complete we use webpack to produce our two UMD builds. This outputs a .min.js which is the minified/obfuscated file. In addition, because the frame build
 * uses webworkers, the build process also outputs a minified file for the webworker. These files just get dumped to the parent directory, so this script moves them to
 * the right place.
 *
 * In order to avoid multiple locations where version numbers are defined, we take the version field from the main package.json file and update it's patch version before
 * we find/replace it's value in each of the generated/compiled files. This version will be used in production to make sure we use the same shim+frame version combo.
 *
 * At this point the two packages are ready for publishing. That doesn't happen in this script directly as it's only meant to happen from our CI job. This script can
 * be safely run locally to test out the build process without publishing actually occuring as a result.
 */

const fs = require("fs");
const path = require("path");
const shell = require("shelljs");
const mainPackage = require("../../package.json");
const shimPackage = require("../../src/shim/package.json");
const framePackage = require("../../src/frame/package.json");

//Fail this script if any of these commands fail
shell.set("-e");

const args = process.argv.slice(2);
const shouldBumpVersion = args.indexOf("--bump") !== -1;

//Ensure that our directory is set to the root of the repo
const rootDirectory = path.dirname(process.argv[1]);
shell.cd(`${rootDirectory}/../../`);

//Cleanup the previous build, if it exists
shell.rm("-rf", "./dist");

/**
 * Bump up the patch version of the provided semver style version number.
 * @param {string} currentVersion Semver style (x.y.z) string version number to bump
 */
function getUpdatedReleaseVersion(currentVersion) {
    const [major, minor, nano] = currentVersion.split(".");
    return `${major}.${minor}.${parseInt(nano) + 1}`;
}

//Convert TS into JS for full source. Output both as ES6 and as CommonJS and remove all unit test files
shell.exec("./node_modules/typescript/bin/tsc --target ES5 --sourceMap false --module ES6 --outDir ./dist/shim/es && yarn run cleanTest");
shell.exec("./node_modules/typescript/bin/tsc --target ES5 --sourceMap false --module CommonJS --outDir ./dist/shim/commonjs && yarn run cleanTest");
//After TS compile, move our hacked up Recrypt loader file back into place for future compile steps.
shell.mv("./src/frame/worker/crypto/recrypt/index.tsb", "./src/frame/worker/crypto/recrypt/index.ts");

//Delete all compiled but unminified/uncombined JS source files for the frame. Since nobody will be importing these source files as part of app development, we
//only ever need the minified combined files to be able to serve from the identity server. It also reduces the tar size for each version which is helpful when
//building the identity service as it has to download tar files for each version.
shell.rm("-R", "./dist/shim/es/frame");
shell.rm("-R", "./dist/shim/commonjs/frame");
shell.mkdir("-p", "./dist/frame/");

//Calculate a new release version by bumping the patch version. Then if we're performing a publish, update the main repos package.json file with this new version
//so that CI can commit that file back on build to main
const newReleaseVersion = getUpdatedReleaseVersion(mainPackage.version);
mainPackage.version = newReleaseVersion;
if (shouldBumpVersion) {
    fs.writeFileSync("./package.json", JSON.stringify(mainPackage, null, 4));
}

//Copy in version and dependencies from main package.json and place those as frame deps
framePackage.dependencies = mainPackage.dependencies;
framePackage.version = newReleaseVersion;
fs.writeFileSync("./dist/frame/package.json", JSON.stringify(framePackage, null, 4));

//Copy the version, Readme, and peerDependencies from the main package.json and place those as shim deps
shimPackage.dependencies = mainPackage.peerDependencies;
shimPackage.version = newReleaseVersion;
fs.writeFileSync("./dist/shim/package.json", JSON.stringify(shimPackage, null, 4));
shell.cp("./src/shim/ShimReadme.md", "./dist/shim/README.md");

//Produce our UMD builds for each package
console.log("\nRunning webpack build for shim code...");
shell.exec("./node_modules/webpack/bin/webpack.js --config webpack/shim.config.js");

//The `output-public-path` config will specify what relative URL to use for the web worker/WebAssembly file. We need to inject the version into that
//request so that right version can be served from the identity server.
console.log("\nRunning webpack build for frame code...");
shell.exec(`./node_modules/webpack/bin/webpack.js --config webpack/frame.config.js --output-public-path='/static/ironweb-frame-${mainPackage.version}/'`);

//Webpack dumps some production generated files at the root of the dist directory, so move it where we need it under the frame directory
shell
    .find("./dist")
    .filter((file) => file.endsWith(".wasm") || file.endsWith("recryptjs.min.js") || file.endsWith("recryptwasm.min.js"))
    .forEach((file) => shell.mv(file, "./dist/frame"));

//Move our type definition and license file into the build output so it gets published to NPM
shell.cp("./ironweb.d.ts", "./dist/shim");
shell.cp("./LICENSE", "./dist/shim");
shell.cp("./LICENSE", "./dist/frame/");

//Inject the NPM version into the compiled files everywhere (Constants file, minified files, map files, etc) so the shim can use it to
//reference the right frame version from the identity server
shell
    .find("./dist")
    .filter((file) => file.match(/\.js(\.map)?$/))
    .forEach((file) => {
        shell.sed("-i", "SDK_NPM_VERSION_PLACEHOLDER", `"${mainPackage.version}"`, file);
    });

console.log("\nBuild successfully complete!");
