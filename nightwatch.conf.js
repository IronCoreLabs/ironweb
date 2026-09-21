const {execSync} = require("child_process");

// Resolve chromedriver and chrome from env vars (set by CI) or PATH
const chromedriverPath = process.env.CHROMEDRIVER_PATH || execSync("which chromedriver", {encoding: "utf8"}).trim();
const chromePath = process.env.CHROME_PATH || execSync("which google-chrome-stable || which google-chrome || which chromium", {encoding: "utf8"}).trim();

module.exports = {
    src_folders: ["integration/nightwatch/tests/"],
    output_folder: "./bin/nightwatch",
    custom_assertions_path: "",
    page_objects_path: "./integration/nightwatch/pageObjects",
    globals_path: "./integration/nightwatch/globalsModule.js",

    webdriver: {
        start_process: true,
        server_path: chromedriverPath,
        // null, not omitted: nightwatch replaces an undefined port with chromedriver's default 9515; null makes selenium pick a free port per suite.
        port: null,
    },

    test_settings: {
        default: {
            launch_url: "https://localhost:4500",
            desiredCapabilities: {
                browserName: "chrome",
                acceptInsecureCerts: true,
                "goog:chromeOptions": {
                    binary: chromePath,
                    args: ["--no-sandbox", "--window-size=1920,1080", "--headless", "--disable-dev-shm-usage", "--ignore-certificate-errors"],
                },
            },
        },
    },
};
