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
        },
    },
    testPathIgnorePatterns: ["/node_modules/", "/nightwatch/"],
    setupFilesAfterEnv: ["./src/tests/jestSetup.ts"],
};
