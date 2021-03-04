#!/usr/bin/env node

/*
 * CI Snapshot Builds
 * ========================
 * The purpose of this script is to perform automatic version bumping and publishing of our private NPM packages for the SDK shim and frame. You can read more
 * about the full release process of this repo within the README.
 *
 * This script is meant to only be executed via CI upon merges into the main branch. If any other branch is in use, nothing will occur. When merges to main
 * happen and this script is run, we trigger the build script. This creates the necessary directory for both our NPM packages as well as bumps the version of each
 * by a patch version (i.e. the z in the x.y.z semver). Once that build is complete we then setup git correctly so that we commit the version bump back to the
 * repos package.json file. We also then push up a git tag for that version as well so we can go back at anytime to know what code was released per version. Once
 * that is all successful we then run our NPM publish step and push up private versions of both the shim and frame packages.
 */

const fs = require("fs");
const path = require("path");
const shell = require("shelljs");

//Fail this script if any of these commands fail
shell.set("-e");

/**
 * Publish the ironweb shim module. Will do  dry-run unless argument is provided to perform actual publish
 * @param {string}  publishDirectory   Directory from which publish operation should execute. Expected that we're in the root project directory when running this method
 */
function publishNPMModule(publishDirectory) {
    shell.pushd(publishDirectory);
    shell.exec("npm publish --access restricted");
    shell.popd();
}

//If we're not on the main branch, don't do anything. We only want to do automatic NPM publishing upon push to main
if (process.env.BRANCH !== "main") {
    shell.echo("\n\nNot on main branch, nothing to do for snapshot build.");
    shell.exit(0);
}

//Check who performed that most recent commit and bail if it was from Leeroy Travis, e.g. this script. Otherwise we'll get an infinite loop
//where this version update will trigger another build endlessly.
const lastCommitAuthor = shell.exec(`git log -n1 --format=format:"%an"`);
if (lastCommitAuthor.stdout === "Leeroy Travis") {
    shell.echo(`\n\nLatest commit was by Leeroy, we shouldn't do anything.`);
    shell.exit(0);
}

//Ensure that our directory is set to the root of this project repo
shell.cd(`${path.dirname(process.argv[1])}/../../`);

//Run the build. This will cause the dist directory to be generated and also modify the package.json to bump it by a patch version
shell.echo("\n\nRunning build process to generate dist output and bump version...\n");
shell.exec("node ./.github/scripts/build.js --bump");

//Get the latest version that was bumped to so that we can use it in our commit messages
const updatedVersion = require("../../package.json").version;

shell.echo(`\n\nBuild successful, version is now set to ${updatedVersion}`);

//Setup git user to our CI user
shell.echo("\n\nSetting up git so Leeroy can commit our version bump back to main\n");
shell.exec('git config --global user.email "leeroytravis@ironcorelabs.com"');
shell.exec('git config --global user.name "Leeroy Travis"');
shell.exec(`git remote add release "https://${process.env.GIT_ACCESS_TOKEN}@github.com/IronCoreLabs/${process.env.GIT_PROJECT_NAME}.git"`);
shell.exec(`git fetch release`);
shell.exec(`git checkout "${process.env.BRANCH}"`);

shell.exec(`git branch --set-upstream-to=release/"$BRANCH"`);
shell.exec("git status");
shell.echo("\n\nComitting version changes back to repo and tagging release...\n");

//Add the version changes in the package.json file back to git. Then tag as that version within git.
shell.exec(`git add package.json`);
shell.exec(`git commit -m "Setting version to ${updatedVersion}"`);
shell.exec(`git tag ${updatedVersion}`);
shell.exec(`git push`);
shell.exec(`git push --tags`);

//Deploy our two private packages to NPM
shell.echo("\n\nPushing frame and shim to NPM as private packages...\n");
publishNPMModule("./dist/shim");
publishNPMModule("./dist/frame");

shell.echo("\n\nSnapshot build successful. Pushed private NPM packages with updated patch version.");
