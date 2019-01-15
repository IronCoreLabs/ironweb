module.exports = {
    beforeEach(browser){
        browser.url(browser.launchUrl);
        const {initializeUser} = browser.page.demoApp().section;
        initializeUser.initializeAndSyncUser();
    },

    'Can share a document with another user at creation time'(browser){
        const demoApp = browser.page.demoApp();
        const {documentList, documentCreate, documentView, commandBar, initializeUser} = demoApp.section;

        let firstUserID;

        commandBar.getUsersID((id) => {
            firstUserID = id;

            commandBar.resetApp();
            initializeUser.initializeAndSyncUser();

            documentList.clickAddNewDocument();

            documentCreate
                .setTodoListName(`Grant access to ${firstUserID}`)
                .enterUserIDToGrantAccess(firstUserID)
                .submitDocument();

            demoApp.assertOnHostedDocumentViewPage();

            documentView
                .waitForElementVisible('@documentViewDetails')
                .assertUserVisibleToSize(2)
                .assertUserVisibleIDAtPosition(1, firstUserID);

            browser.end();
        });
    },

    'Can share a document with a group at creation time'(browser){
        const demoApp = browser.page.demoApp();
        const {documentList, documentCreate, documentView, groupList, groupCreate, groupDetail} = demoApp.section;

        demoApp.switchToGroubTabUI();

        groupList.clickAddNewGroup()
        demoApp.assertOnGroupCreatePage();

        groupCreate
            .enterGroupName('share with group on create')
            .submitNewGroup();

        demoApp.assertOnGroupDetailPage();

        groupDetail.getGroupID((groupID) => {

            demoApp.switchToDocumentTabUI();

            documentList.clickAddNewDocument();

            documentCreate
                .setTodoListName(`Grant access to group ${groupID}`)
                .clickOnGroupGrantAccessCheckbox(groupID)
                .submitDocument();

            demoApp.assertOnHostedDocumentViewPage();

            documentView
                .waitForElementVisible('@documentViewDetails')
                .assertUserVisibleToSize(1)
                .assertGroupVisibleToSize(1)
                .clickRevokeAccessButton();

            browser.pause(350);

            documentView.assertGroupVisibleToSize(0);

            browser.end();
        });

        browser.end();
    },
};