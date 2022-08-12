module.exports = {
    "@tags": ["hostedDocCreate"],
    beforeEach(browser) {
        browser.url(browser.launchUrl);
        const {initializeUser} = browser.page.demoApp().section;
        initializeUser.initializeAndSyncUser();
    },

    "Can add new hosted todo list name and takes user to detail page when finished"(browser) {
        const demoApp = browser.page.demoApp();
        const {documentList, documentCreate, documentView} = demoApp.section;

        documentList.clickAddNewDocument();

        const docName = "hosted nightwatch document";
        const todoItem = "do integration testing";

        documentCreate.setTodoListName(docName).setTodoListItem(todoItem).submitDocument();

        demoApp.assertOnHostedDocumentViewPage();

        documentView
            .waitForElementVisible("@documentViewDetails")
            .assertDocumentName(docName)
            .assertHasTodoItemAtIndex(todoItem)
            .assertUserVisibleToSize(1)
            .assertGroupVisibleToSize(0);

        browser.end();
    },

    "Can add hosted todo list with own provided ID"(browser) {
        const demoApp = browser.page.demoApp();
        const {documentList, documentCreate, documentView} = demoApp.section;

        documentList.clickAddNewDocument();

        const docID = "myID-" + Date.now();
        const docName = "hosted nightwatch document";
        const todoItem = "do integration testing";

        documentCreate.setTodoListID(docID).setTodoListName(docName).setTodoListItem(todoItem).submitDocument();

        demoApp.assertOnHostedDocumentViewPage();

        documentView
            .waitForElementVisible("@documentViewDetails")
            .assertDocumentID(docID)
            .assertDocumentName(docName)
            .assertHasTodoItemAtIndex(todoItem)
            .assertUserVisibleToSize(1)
            .assertGroupVisibleToSize(0);

        browser.end();
    },

    "Can add hosted todo list and it shows up on document list page"(browser) {
        const demoApp = browser.page.demoApp();
        const {documentList, documentCreate, documentView} = demoApp.section;

        const docName = "hostednightwatch document";

        documentList.clickAddNewDocument();

        documentCreate.setTodoListName(docName).submitDocument();

        demoApp.assertOnHostedDocumentViewPage();
        documentView.waitForElementVisible("@documentViewDetails").assertDocumentName(docName).backToDocumentList();

        demoApp.assertOnDocumentListPage();

        documentList.refreshList().expectCountOfTodoLists(1).expectTodoListNameAtPosition(0, docName).expectTodoListHostedAtPosition(0).clickOnNthTodoList(0);

        demoApp.assertOnHostedDocumentViewPage();

        documentView.waitForElementVisible("@documentViewDetails").assertDocumentName(docName);

        browser.end();
    },
};