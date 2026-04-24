module.exports = {
    "@tags": ["unmanagedStreamingEncrypt"],
    beforeEach(browser) {
        browser.url(browser.launchUrl);
        const {initializeUser} = browser.page.demoApp().section;
        initializeUser.initializeAndSyncUser();
    },

    "Can perform unmanaged streaming encrypt and decrypt round-trip"(browser) {
        const demoApp = browser.page.demoApp();
        const {documentList} = demoApp.section;

        documentList.clickTestUnmanagedStreaming();
        documentList.waitForElementVisible("@unmanagedStreamingTestSuccess");

        browser.end();
    },
};
