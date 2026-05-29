/**
 * Actions and assertions for document detail page, for both hosted and local documents
 */
const documentViewActions = {
    assertDocumentID(id) {
        this.expect.element("@documentIDText").text.to.equal(`ID: ${id}`);
        return this;
    },
    assertDocumentName(documentName) {
        this.expect.element("@documentNameInput").value.to.equal(documentName);
        return this;
    },
    changeDocumentName(newName) {
        return this.clearValue("@documentNameInput")
            .setValue("@documentNameInput", newName)
            .sendKeys("@documentNameInput", this.api.Keys.TAB)
            .waitForElementPresent("@documentNameInput");
    },
    backToDocumentList() {
        return this.click("@backToListButton");
    },
    assertHasTodoItemAtIndex(todoText, index = 0) {
        browser.element.findAll(this.elements.todoListItems.selector).nth(index).getText((result) => {
            this.assert.equal(result.value, todoText, `Todo list item content, expected "${todoText}", found "${result.value}"`);
        });
        return this;
    },
    addNewTodoText(todoText) {
        return this.setValue("@updateTodoInput", todoText);
    },
    submitNewTodo() {
        return this.click("@updateTodoInput")
            .sendKeys("@updateTodoInput", this.api.Keys.ENTER)
            .waitForElementVisible("@updateTodoInput");
    },
    assertUserVisibleToSize(size) {
        browser.waitForElementPresent(`css selector`, `.document-visibility[data-user-count="${size}"]`, 5000,
            `Expected user visible count of "${size}"`);
        return this;
    },
    assertUserVisibleIDAtPosition(position, id) {
        browser.element.findAll(this.elements.userVisibleItem.selector).nth(position).getText((result) => {
            this.assert.equal(result.value.includes(id), true, `Expected roughly visible to ID "${id}", found "${result.value}"`);
        });
        return this;
    },
    assertGroupVisibleToSize(size) {
        browser.waitForElementPresent(`css selector`, `.document-visibility[data-group-count="${size}"]`, 5000,
            `Expected group visible count of "${size}"`);
        return this;
    },
    enterUserIDToGrantAccess(id) {
        return this.setValue("@userGrantInput", id);
    },
    clickGroupList() {
        browser.click(this.client.locateStrategy, this.elements.groupVisibleToList.selector);
        return this;
    },
    clickGrantAccessButton() {
        browser
            .click(this.client.locateStrategy, this.elements.grantAccessButton.selector)
            .waitForElementPresent(this.client.locateStrategy, this.elements.grantAccessButton.selector);
        return this;
    },
    clickRevokeAccessButton() {
        return this.click("@revokeAccessButton");
    },
    clickOnGroupGrantAccessCheckbox(groupID) {
        browser.waitForElementPresent("css selector", `#${groupID}`, 5000);
        browser.click("css selector", `#${groupID}`);
        return this;
    },
};

const documentViewElements = {
    backToListButton: {selector: '.back-to-document-list'},
    refreshDocumentButton: {selector: '.refresh-document-view'},
    documentNameInput: {selector: '#documentName'},
    documentIDText: {selector: '.document-id'},
    documentViewDetails: {selector: '.document-view-details'},
    todoListWrapper: {selector: '.todo-list'},
    emptyTodoList: {selector: '.todo-list-empty'},
    todoListItems: {selector: '.todo-list-item'},
    updateTodoInput: {selector: '#newTodoItem'},
    userVisibleToList: {selector: '.user-visible-to'},
    userVisibleItem: {selector: '.user-visible-item'},
    groupVisibleToList: {selector: '.group-visible-to'},
    groupVisibleItem: {selector: '.group-visible-item'},
    userGrantInput: {selector: '#userAccessID'},
    grantAccessButton: {selector: '.grant-access-submit'},
    revokeAccessButton: {selector: '.revoke-access'},
};

module.exports = {
    commands: [documentViewActions],
    elements: documentViewElements,
    selector: '.document-view',
};