module.exports = {
    clearMocks: true,
    restoreMocks: true,
    errorOnDeprecated: true,
    coverageThreshold: {
        global: {
            branches: 93,
            functions: 93,
            lines: 93,
        },
    },
    preset: "ts-jest/presets/js-with-ts",
    transform: {
        "^.+\\.tsx?$": "ts-jest",
    },
    globals: {
        SDK_NPM_VERSION_PLACEHOLDER: JSON.stringify("testversion"),
        _WORKER_PATH_LOCATION_: JSON.stringify("testpath"),
        "ts-jest": {
            diagnostics: {
                ignoreCodes: [151001],
            },
            //This can be removed once https://github.com/kulshekhar/ts-jest/issues/1471 is released, probably in ts-jest 25.3.0
            tsConfig: {
                outDir: "$$ts-jest$$",
            },
        },
    },
    testPathIgnorePatterns: ["/node_modules/", "/nightwatch/", "/protobuf/"],
    coveragePathIgnorePatterns: ["EncryptedDeks.js"],
    setupFilesAfterEnv: ["./src/tests/jestSetup.ts"],
};
