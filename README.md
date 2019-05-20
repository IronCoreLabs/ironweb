# IronCore Labs JavaScript SDK

[![Build Status](https://travis-ci.org/IronCoreLabs/ironweb.svg?branch=master)](https://travis-ci.org/IronCoreLabs/ironweb)
[![NPM Version](https://badge.fury.io/js/%40ironcorelabs%2Fironweb.svg)](https://www.npmjs.com/package/@ironcorelabs/ironweb)

SDK for using IronCore from your browser-based JavaScript application. Read [our documentation](https://docs.ironcorelabs.com) for further information about how to integrate this library into your client side application.

## Installation

`npm install @ironcorelabs/ironweb`

## Quickstart

Two quick-starts are available on the [documentation site](https://docs.ironcorelabs.com). These quick-starts will guide you through getting started with the IronWeb SDK in either a [vanilla JS](https://docs.ironcorelabs.com/getting-started/vanilla-javascript), [React](https://github.com/IronCoreLabs/getting-started-react) , or [Angular](https://docs.ironcorelabs.com/getting-started/angular) codebase.

## Types

This library contains a [TypeScript definitions](ironweb.d.ts) file which shows the available classes and methods for this SDK.

## Local Development

### Unit Testing and Linting

This repo uses NPM scripts in order to run all tests and linting. You can run both the unit tests and linting together by running `yarn test`.

#### Linting

[TSLint](https://palantir.github.io/tslint/) and [ESLint](https://eslint.org/) are used to run linting on all source code. In addition this repo has a [Prettier](https://prettier.io) configuration to auto-format source code upon save. Prettier should be configured within your IDE before contributing to this project.

`yarn run lint`

### Unit Testing

This repo uses [Karma](https://karma-runner.github.io/latest/index.html) and [Jasmine](https://jasmine.github.io/) for all unit testing. The unit tests are run using a headless version of Chrome to verify that all tests work in a browser-based environment.

`yarn run unit`

To run a subset of the tests you can use the `-t` option of Jest to only run tests whose name matches the provided value

`yarn run unit --filter GroupCrypto`

This library also has minimums for unit test code coverage in order to pass. These coverage minimums are configured within the `karma.conf.js` file and determine what the minimum % of code coverage is for various metrics before the unit tests will pass.

Copyright (c)  2017-present  IronCore Labs, Inc.
All rights reserved.
