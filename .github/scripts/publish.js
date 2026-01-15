#!/usr/bin/env node

/*
 * IronWeb SDK Publish File
 * ========================
 *
 * This script is meant to publicly publish our ironweb shim to NPM for customer consumption. It takes the version to publish as an argument and then moves the code from our
 * internal shim NPM package to the external one. It performs the following operations:
 *
 *  + Verify the associated frame version is in production. If the equivalent version of the frame that goes with this shim isn't yet in production, the publish will abort and
 *    fail. This allows us to verify before we make the shim public that it will work for customers against the production environment.
 *
 *  + Download the internal shim from NPM for the version to deploy. It then cleans up the package.json file for that package to remove all the NPM added cruft.
 *
 *  + Change the name of the package to our public shim NPM package.
 *
 *  + If the '--publish' option is provided, it will then perform the actual NPM publish step, otherwise we'll perform a dry run for testing purposes.
 */

const fs = require("fs");
const path = require("path");
const https = require("https");
const shell = require("shelljs");

//Fail this script if any of these commands fail
shell.set("-e");

const args = process.argv.slice(2);
//Make sure the user passes in a version to publish
if (args.indexOf("--version") === -1) {
    shell.echo("You must provide the version of ironweb to publish publicly with the '--version' argument, e.g. '--version 1.2.3'.");
    shell.exit(-1);
}

if (!process.env.NODE_AUTH_TOKEN) {
    shell.echo("\n\nEnvironment variable NODE_AUTH_TOKEN must be set in order to download @ironcorelabs/ironweb-internal.");
    shell.exit(0);
}

const PUBLISH_VERSION = args[args.indexOf("--version") + 1];
const SHOULD_PUBLISH = args.indexOf("--publish") !== -1;
const PRODUCTION_FRAME_FILE_URL = `https://api.ironcorelabs.com/static/ironweb-frame-${PUBLISH_VERSION}/ironweb-frame.min.js`;

//Ensure that our directory is set to where this file lives
const rootDirectory = path.dirname(process.argv[1]);
shell.cd(rootDirectory);

/**
 * Tweak the package.json file content from the pulled down version of the file from NPM. Cleanup the added content that NPM adds and
 * also swap out the package name so we can publish it against the public NPM package.
 * @param {Object} packageJsonContent Package.json of internal ironweb repo in JSON form
 */
function prepareInternalPackageForRelease(packageJsonContent) {
    //The downloaded package.json from NPM includes a whole bunch of "added" properties including a bunch that are all prefixed
    //with underscores. Nuke all that content before we re-deploy up to the public package.
    delete packageJsonContent.deprecated;
    delete packageJsonContent.bundleDependencies;
    for (let key in packageJsonContent) {
        if (packageJsonContent.hasOwnProperty(key) && key[0] === "_") {
            delete packageJsonContent[key];
        }
    }
    packageJsonContent.name = "@ironcorelabs/ironweb";
    packageJsonContent.repository = {url: "git+https://github.com/IronCoreLabs/ironweb.git", type: "git"};
    return packageJsonContent;
}

//Perform all operations within a publish directory. Also create a node_modules directory within here so when we request the internal package from NPM
//it'll install it under the publish directory and not in the project root node_modules directory.
shell.rm("-rf", "./publish");
shell.mkdir("-p", "./publish/node_modules");

https.get(PRODUCTION_FRAME_FILE_URL, (response) => {
    //If we couldn't find the associated version of the frame published in production, fail the publish script.
    if (response.statusCode !== 200) {
        shell.echo(
            `Could not find version '${PUBLISH_VERSION}' of the ironweb-frame hosted in production. Requested '${PRODUCTION_FRAME_FILE_URL}' which returned a non 200 status code. Instead got a '${response.statusCode}' status code`
        );
        shell.exit(1);
    }
    shell.pushd("./publish");
    //Pull down the private internal ironweb content from NPM and move things around so we can republish it under the public name
    shell.exec(`npm install @ironcorelabs/ironweb-internal@${PUBLISH_VERSION} --no-save --omit=dev`);
    // We use Trusted Publishing to publish, so we can't have this env var set anymore
    shell.exec("unset NODE_AUTH_TOKEN");
    shell.mv("./node_modules/@ironcorelabs/ironweb-internal/*", "./");
    shell.rm("-rf", "./node_modules");

    const internalPackageJson = prepareInternalPackageForRelease(require("./publish/package.json"));
    fs.writeFileSync("./package.json", JSON.stringify(internalPackageJson, null, 2));

    //Publish!
    shell.exec(SHOULD_PUBLISH ? "npm publish --access public" : "npm publish --dry-run");

    //Go back to the main directory and cleanup the directory
    shell.popd();
    shell.rm("-rf", "./publish");
});
