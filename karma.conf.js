module.exports = function(config) {
    const fileListGlob = "src/**/!(WorkerLoader)*.+(ts)";
    //Allow for filtering down files to run to just match the item passed in
    let clientArgs = {};
    if (config.filter) {
        clientArgs = {
            args: ["--grep", config.filter],
        };
    }

    config.set({
        frameworks: ["jasmine", "karma-typescript", "jasmine-matchers"],
        files: [{pattern: fileListGlob}],
        preprocessors: {
            [fileListGlob]: ["karma-typescript"],
        },
        reporters: ["spec", "jasmine-diff", "karma-typescript", "threshold"],
        specReporter: {
            suppressSkipped: true,
            showSpecTiming: true,
        },
        thresholdReporter: {
            statements: 95,
            branches: 85,
            functions: 95,
            lines: 95,
        },
        client: clientArgs,
        browserNoActivityTimeout: 20000,
        browsers: ["ChromeHeadlessNoSandbox"],
        //https://docs.travis-ci.com/user/chrome#Sandboxing
        customLaunchers: {
            ChromeHeadlessNoSandbox: {
                base: "ChromeHeadless",
                flags: ["--no-sandbox"],
            },
        },
        //If no filter is provided, just do a single run, otherwise let the test rerun on each file change
        singleRun: config.filter === undefined && config.watch === undefined,
        karmaTypescriptConfig: {
            reports: {
                html: {
                    directory: "bin/",
                    subdirectory: "chromeheadless",
                },
            },
            compilerOptions: {
                lib: ["es6", "dom"],
                noImplicitAny: false,
                //Don't blow up unit tests when doing single runs for type issues
                noEmitOnError: config.filter === undefined && config.watch === undefined,
            },
            bundlerOptions: {
                constants: {
                    SDK_NPM_VERSION_PLACEHOLDER: JSON.stringify("testversion"),
                },
                resolve: {
                    alias: {
                        //Our unit tests can't obviously deal with WASM, so mock out that dep entirely
                        "@ironcorelabs/recrypt-wasm-binding": "./src/tests/RecryptMock.ts",
                    },
                },
                transforms: [
                    function(context, callback) {
                        //Replace WebWorker loader with mocked value that doesn't actually try to load a WebWorker
                        if (context.module.indexOf("WorkerMediator") !== -1) {
                            const mockedWebWorker = `const worker = {
                                addEventListener: jasmine.createSpy('addEventListener'),
                                postMessage: jasmine.createSpy('postMessage')
                            }`;
                            context.source = context.source.replace(/import\sworker\sfrom\s[^;]*;/, mockedWebWorker);
                            return callback(undefined, true);
                        }
                        //Replace dynamic Recrypt module import with just a hardcoded value which returns the RecryptWASM wrapper
                        if (context.module.indexOf("recrypt/index.ts") !== -1) {
                            const addedWasmInclude = `
                                import Future from "futurejs";
                                import * as Recrypt from "./RecryptWasm";
                            `;
                            const mockedReturnValue = `export default function loadRecrypt() {return Future.of(Recrypt);}`;
                            context.source = context.source.replace(/import\sFuture\sfrom\s[^;]*;/, addedWasmInclude);
                            context.source = context.source.replace(/export default function loadRecrypt[()]+\s*{[^\Z]*/, mockedReturnValue);
                            return callback(undefined, true);
                        }
                        return callback(undefined, false);
                    },
                ],
            },
            exclude: ["integration/**/*"],
        },
    });
};
