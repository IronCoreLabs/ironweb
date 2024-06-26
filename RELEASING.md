# Releasing

IronWeb has a fairly complex release process. This is because we have multiple packages that need to be shipped - the shim code that developers consume, and the frame code that we need to host on our servers. The frame code has to be present before we can publish the shim code to avoid version dependency problems. This document has information on various topics from publishing steps to testing against different environments.

## Automatic Internal Publishing

Every merge to main of this repo bumps the patch version (defined in the `package.json` file) and pushes the results to two private NPM packages, the shim and the frame. Publishing both of these internally at first allows us to consume the frame code from ironcore-id and get it deployed to various environments before we make the shim public for consumers. This ensures that the proper production version of the frame is available before the same version of the shim is available.

When a merge to main happens, Github Actions will run the `.github/scripts/snapshot.js` script which produces a build, bumps the version of the repo by a patch version, and pushes both the shim and frame to their private NPM repos. It then also commits the version bump changes to the `package.json` file back to the repo and also pushes up a git tag.

## Public Publishing

Once the version of the frame we want to release has been pushed out to production, we manually run the `.github/scripts/publish.js` script. This script takes the version to publicly publish as an argument. In then verifies that the associated version of the frame exists in production. If so, it will then download the code from the internal shim repo on NPM, and convert it over to our public NPM package and perform a deployment.

## Full Deployment Process

-   The first thing to check is whether the version we're going to release should be a major, minor, or patch release. If it's a major or minor, update that number in the `package.json` file. If the change is only a patch version, no changes to the `package.json` file are necessary.
-   Once all changes for the release are pushed to main an automatic patch version bump will occur. At this point the two internal NPM packages are ready for consumption from ironcore-id.
-   Publish the ironweb changes to ironcore-id in dev by running [this workflow](https://github.com/IronCoreLabs/ironcore-id/actions/workflows/bump-version.yaml). Whenever ironcore-id is built it will automatically pull new ironweb internal packages into its container.
-   Test the ironweb changes in staging ironcore-id
    -   deploy ironcore-id into staging
    -   check https://api-staging.ironcorelabs.com/static/ironweb-frame-{VERSION}/ironweb-frame.min.js
    -   create in the admin console or use an existing project/segment private key and [`project.json` file](https://github.com/IronCoreLabs/design-docs/blob/main/engineering/ironwebLocalDevelopment.md#integration-app-testing).
    -   see [these instructions](https://github.com/IronCoreLabs/design-docs/blob/main/engineering/ironwebLocalDevelopment.md#testing-against-development-stage-or-production) (if you have access) on targeting different environments with the integration app.
-   Once testing is done we need to deploy ironcore-id into production.
-   _(only necessary when frame releases are involved)_ When that is complete, do a dry run of the `.github/scripts/publish.js` script with the version to publish (e.g. `--version 1.5.2`) and verify that the content that will be published looks correct. If so, then re-run the script with the `--publish` argument. This script will verify that the version you're releasing exists in production and if so, will then push our project to our public NPM repo. At this point developers will now be able to consume this new version in their project.

It's worth noting that with this release process, our external version numbers that consumers see won't be sequential. We'll likely bump patch versions multiple times during our process before we decide to cut a public version. For example, if the current public version is `1.3.3` but during development we merge in 4 different PRs before release, then the next version that consumers see will be `1.3.7`. This shouldn't be a big deal as long as we correctly update our major/minor versions.

In addition, it won't ever be possible to release a `.0` patch version of this library. Because the deploy script will always bump the patch version on merge to main, even if you change the version to `1.4.0` as part of your changes, once that is merged to main the version will then become `1.4.1`.
