module.exports = {
    "@tags": ["focus"],
    beforeEach(browser) {
        browser.url(browser.launchUrl);
        const {initializeUser} = browser.page.demoApp().section;
        initializeUser.initializeAndSyncUser();
    },

    "Can grant and revoke a document with a group given its ID"(browser) {
        const demoApp = browser.page.demoApp();
        const {documentList, documentCreate, documentView, groupList, groupCreate, groupDetail} = demoApp.section;

        demoApp.switchToGroubTabUI();

        groupList.clickAddNewGroup();
        demoApp.assertOnGroupCreatePage();

        groupCreate.enterGroupName("share with group").enterGroupID(`share-with-group--${Date.now()}`).submitNewGroup();

        demoApp.assertOnGroupDetailPage();

        groupDetail.getGroupID((groupID) => {
            demoApp.switchToDocumentTabUI();

            documentList.clickAddNewDocument();

            documentCreate.setTodoListName(`Grant access to group ${groupID}`).submitDocument();

            demoApp.assertOnHostedDocumentViewPage();

            documentView
                .waitForElementVisible("@documentViewDetails")
                .assertUserVisibleToSize(1)
                .assertGroupVisibleToSize(0)
                .clickOnGroupGrantAccessCheckbox(groupID)
                .clickGrantAccessButton()
                .assertUserVisibleToSize(1)
                .clickGroupList()
                .assertGroupVisibleToSize(1)
                .clickRevokeAccessButton();

            browser.pause(350);

            documentView.assertGroupVisibleToSize(0);

            browser.end();
        });
    },
};