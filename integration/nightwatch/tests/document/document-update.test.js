module.exports = {
    beforeEach(browser){
        browser.url(browser.launchUrl);
        const {initializeUser} = browser.page.demoApp().section;
        initializeUser.initializeAndSyncUser();
    },

    'Can update existing document name'(browser){
        const demoApp = browser.page.demoApp();
        const {documentList, documentCreate, documentView} = demoApp.section;

        documentList.clickAddNewDocument();

        const originalDocName = 'hosted nightwatch document';
        const updatedDocName = 'updated name only';

        documentCreate
            .setTodoListName(originalDocName)
            .submitDocument();

        demoApp.assertOnHostedDocumentViewPage();

        documentView
            .waitForElementVisible('@documentViewDetails')
            .assertDocumentName(originalDocName)
            .changeDocumentName(updatedDocName)
            .backToDocumentList();

        demoApp.assertOnDocumentListPage();

        documentList.refreshList().expectCountOfTodoLists(1).expectTodoListNameAtPosition(0, updatedDocName);

        browser.end();
    },

    'Can add new todo items to existing documents'(browser){
        const demoApp = browser.page.demoApp();
        const {documentList, documentCreate, documentView} = demoApp.section;

        documentList.clickAddNewDocument();

        const docName = 'hosted nightwatch document';
        const firstTodoItem = 'do integration testing';
        const secondTodoItem = 'list update item';

        documentCreate
            .setTodoListName(docName)
            .setTodoListItem(firstTodoItem)
            .submitDocument();

        demoApp.assertOnHostedDocumentViewPage();

        /**
         * Assert we're on the right todo list and that we have the expected one item. Then add a new
         * item and make sure it gets added as we expect
         */
        documentView
            .waitForElementVisible("@documentViewDetails")
            .assertDocumentName(docName)
            .assertHasTodoItemAtIndex(firstTodoItem)
            .addNewTodoText(secondTodoItem)
            .submitNewTodo()
            .assertHasTodoItemAtIndex(secondTodoItem, 1);
        // browser.elements("css selector", ".todo-list-item", (elements) => {
        //     console.log(elements.value);
        // });

        browser.end();
    },
};