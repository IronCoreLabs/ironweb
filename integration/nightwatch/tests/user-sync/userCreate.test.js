module.exports = {
    "@tags": ["userCreate"],
    beforeEach(browser) {
        browser.url(browser.launchUrl);
    },

    "User Create"(browser) {
        const demoApp = browser.page.demoApp();
        const {initializeUser, documentList} = demoApp.section;

        initializeUser.initializeAndSyncUser();

        //We should hit the document list page after init, but not have any documents listed
        demoApp.assertOnDocumentListPage();
        documentList.expect.element("@listItems").to.not.be.present;

        browser.end();
    },
};