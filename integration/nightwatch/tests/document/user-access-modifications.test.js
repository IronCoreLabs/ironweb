module.exports = {
    beforeEach(browser) {
        browser.url(browser.launchUrl);
        const {initializeUser} = browser.page.demoApp().section;
        initializeUser.initializeAndSyncUser();
    },

    "Can share a document with another user given their ID"(browser) {
        const demoApp = browser.page.demoApp();
        const {documentList, documentCreate, documentView, commandBar, initializeUser} = demoApp.section;

        let firstUserID;

        commandBar.getUsersID((id) => {
            firstUserID = id;

            commandBar.resetApp();
            initializeUser.initializeAndSyncUser();

            documentList.clickAddNewDocument();

            documentCreate.setTodoListName(`Grant access to ${firstUserID}`).submitDocument();

            demoApp.assertOnHostedDocumentViewPage();

            documentView
                .waitForElementVisible("@documentViewDetails")
                .enterUserIDToGrantAccess(firstUserID)
                .clickGrantAccessButton()
                .assertUserVisibleToSize(2)
                .assertUserVisibleIDAtPosition(0, firstUserID);

            browser.end();
        });
    },

    "Can remove share from user as document author"(browser) {
        const demoApp = browser.page.demoApp();
        const {documentList, documentCreate, documentView, commandBar, initializeUser} = demoApp.section;

        let firstUserID;

        commandBar.getUsersID((id) => {
            firstUserID = id;

            commandBar.resetApp();
            initializeUser.initializeAndSyncUser();

            documentList.clickAddNewDocument();

            documentCreate.setTodoListName(`Grant access to ${firstUserID}`).submitDocument();

            demoApp.assertOnHostedDocumentViewPage();

            documentView
                .waitForElementVisible("@documentViewDetails")
                .enterUserIDToGrantAccess(firstUserID)
                .clickGrantAccessButton()
                .assertUserVisibleToSize(2)
                .clickRevokeAccessButton();

            //Wait for the removal to complete
            browser.pause(350);

            documentView.assertUserVisibleToSize(1);

            browser.end();
        });
    },
};