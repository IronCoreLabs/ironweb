/**
 * Actions and assertions for document list page view
 */
const documentListActions = {
    expectTodoListStorageType(selector, position){
        browser.elements(this.client.locateStrategy, this.elements.listItems.selector, (elements) => {
            this.api.elementIdElement(Object.values(elements.value[position])[0], this.client.locateStrategy, selector, (chipElement) => {
                this.assert.equal(chipElement.status, 0, chipElement.status === -1 ? chipElement.value.message : "Found correct storage chip");
            });
        });
        return this;
    },
    refreshList(){
        return this.click('@refreshDocumentList');
    },
    clickAddNewDocument(){
        return this.click('@newDocumentButton');
    },
    expectCountOfTodoLists(length){
        browser.waitForElementPresent('css selector', `.document-list[data-doc-count="${length}"]`, 5000,
            `Expected document count of "${length}"`);
        return this;
    },
    expectTodoListNameAtPosition(position, name){
        browser.elements(this.client.locateStrategy, this.elements.listItems.selector, (elements) => {
            this.api.elementIdText(Object.values(elements.value[position])[0], (elementText) => {
                this.assert.equal(elementText.value.includes(name), true, `Todo list content, expected roughly "${name}", found "${elementText.value}"`);
            });
        });
        return this;
    },
    expectTodoListHostedAtPosition(position){
        return this.expectTodoListStorageType(this.elements.hostedStorageChip.selector, position);
    },
    expectTodoListLocalAtPosition(position){
        return this.expectTodoListStorageType(this.elements.localStorageChip.selector, position);
    },
    clickTestUnmanaged(){
        return this.click('@testUnmanagedButton');
    },
    clickTestStreaming(){
        return this.click('@testStreamingButton');
    },
    clickTestUnmanagedStreaming(){
        return this.click('@testUnmanagedStreamingButton');
    },
    clickOnNthTodoList(item){
        browser.elements(this.client.locateStrategy, this.elements.listItems.selector, (elements) => {
            this.api.elementIdClick(Object.values(elements.value[item])[0]);
        });
    },
};

const documentListElements = {
    pageTitle: {selector: '.page-title'},
    listItems: {selector: '.document-list-item'},
    newDocumentButton: {selector: '.new-document'},
    hostedStorageChip: {selector: '.storage-type-hosted'},
    localStorageChip: {selector: '.storage-type-local'},
    refreshDocumentList: {selector: '.refresh-document-list'},
    testUnmanagedButton: {selector: '.test-unmanaged'},
    unmanagedTestSuccess: {selector: '.unmanaged-test-success'},
    unmanagedTestError: {selector: '.unmanaged-test-error'},
    testStreamingButton: {selector: '.test-streaming'},
    streamingTestSuccess: {selector: '.streaming-test-success'},
    streamingTestError: {selector: '.streaming-test-error'},
    testUnmanagedStreamingButton: {selector: '.test-unmanaged-streaming'},
    unmanagedStreamingTestSuccess: {selector: '.unmanaged-streaming-test-success'},
    unmanagedStreamingTestError: {selector: '.unmanaged-streaming-test-error'},
};

module.exports = {
    commands: [documentListActions],
    elements: documentListElements,
    selector: '.document-list',
};