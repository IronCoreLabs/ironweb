module.exports = {
    "@tags": ["streamingEncrypt"],
    beforeEach(browser) {
        browser.url(browser.launchUrl);
        const {initializeUser} = browser.page.demoApp().section;
        initializeUser.initializeAndSyncUser();
    },

    "Can perform streaming encrypt and decrypt round-trip"(browser) {
        const demoApp = browser.page.demoApp();
        const {documentList} = demoApp.section;

        documentList.clickTestStreaming();
        documentList.waitForElementVisible("@streamingTestSuccess");

        browser.end();
    },
};
