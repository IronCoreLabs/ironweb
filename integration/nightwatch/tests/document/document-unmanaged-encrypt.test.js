module.exports = {
    "@tags": ["unmanagedEncrypt"],
    beforeEach(browser) {
        browser.url(browser.launchUrl);
        const {initializeUser} = browser.page.demoApp().section;
        initializeUser.initializeAndSyncUser();
    },

    "Can perform unmanaged encrypt and decrypt round-trip"(browser) {
        const demoApp = browser.page.demoApp();
        const {documentList} = demoApp.section;

        documentList.clickTestUnmanaged();
        documentList.waitForElementVisible("@unmanagedTestSuccess");

        browser.end();
    },
};
