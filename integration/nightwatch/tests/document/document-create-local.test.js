module.exports = {
    '@tags': ['localDocCreate'],
    beforeEach(browser){
        browser.url(browser.launchUrl);
        const {initializeUser} = browser.page.demoApp().section;
        initializeUser.initializeAndSyncUser();
    },

    'Can add new local todo list with name and takes user to detail page when finished'(browser){
        const demoApp = browser.page.demoApp();
        const {documentList, documentCreate, documentView} = demoApp.section;

        const docName = 'local nightwatch document';
        const todoItem = 'do integration testing';

        documentList.clickAddNewDocument();

        documentCreate
            .toggleStorage()
            .setTodoListName(docName)
            .setTodoListItem(todoItem)
            .submitDocument();

        demoApp.assertOnLocalDocumentViewPage();

        documentView
            .waitForElementVisible('@documentViewDetails')
            .assertDocumentName(docName)
            .assertHasTodoItemAtIndex(todoItem)
            .assertUserVisibleToSize(1)
            .assertGroupVisibleToSize(0);

        browser.end();
    },

    'Can add local todo list with own provided ID'(browser){
        const demoApp = browser.page.demoApp();
        const {documentList, documentCreate, documentView} = demoApp.section;

        const docID = 'myID-' + Date.now();
        const docName = 'local nightwatch document';
        const todoItem = 'do integration testing';

        documentList.clickAddNewDocument();

        documentCreate
            .toggleStorage()
            .setTodoListID(docID)
            .setTodoListName(docName)
            .setTodoListItem(todoItem)
            .submitDocument();

        demoApp.assertOnLocalDocumentViewPage();

        documentView
            .waitForElementVisible('@documentViewDetails')
            .assertDocumentID(docID)
            .assertDocumentName(docName)
            .assertHasTodoItemAtIndex(todoItem)
            .assertUserVisibleToSize(1)
            .assertGroupVisibleToSize(0);

        browser.end();
    },

    'Can add local todo list and it shows up on document list page'(browser){
        const demoApp = browser.page.demoApp();
        const {documentList, documentCreate, documentView} = demoApp.section;

        const docName = 'local nightwatch document';

        documentList.clickAddNewDocument();

        documentCreate
            .toggleStorage()
            .setTodoListName(docName)
            .submitDocument();

        demoApp.assertOnLocalDocumentViewPage();
        documentView
            .waitForElementVisible('@documentViewDetails')
            .assertDocumentName(docName)
            .backToDocumentList();

        demoApp.assertOnDocumentListPage();

        documentList
            .expectCountOfTodoLists(1)
            .expectTodoListNameAtPosition(0, docName)
            .expectTodoListLocalAtPosition(0)
            .clickOnNthTodoList(0);

        demoApp.assertOnLocalDocumentViewPage();

        documentView
            .waitForElementVisible('@documentViewDetails')
            .assertDocumentName(docName);

        browser.end();
    },
};