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
        this.setValue("@documentNameInput", newName);
        this.api.elementIdClick(this.elements.documentNameInput.selector, () => {
            this.api.keys(this.api.Keys.TAB);
            this.waitForElementPresent("@documentNameInput");
        });
        return this;
    },
    backToDocumentList() {
        return this.click("@backToListButton");
    },
    assertHasTodoItemAtIndex(todoText, index = 0) {
        browser.elements("css selector", this.elements.todoListItems.selector, (elements) => {
            this.api.elementIdText(Object.values(elements.value[index])[0], (elementText) => {
                this.assert.equal(elementText.value, todoText, `Todo list item content, expected "${todoText}, found "${elementText.value}"`);
            });
        });
        return this;
    },
    addNewTodoText(todoText) {
        return this.setValue("@updateTodoInput", todoText);
    },
    submitNewTodo() {
        this.api.elementIdClick(this.elements.updateTodoInput.selector, () => {
            this.api.sendKeys("#newTodoItem", this.api.Keys.ENTER);
            this.waitForElementVisible("@updateTodoInput");
        });
        return this;
    },
    assertUserVisibleToSize(size) {
        browser.elements(this.client.locateStrategy, this.elements.userVisibleItem.selector, (elements) => {
            this.assert.equal(elements.value.length, size, `Expected user visible count of "${size}", found "${elements.value.length}"`);
        });
        return this;
    },
    assertUserVisibleIDAtPosition(position, id) {
        browser.elements(this.client.locateStrategy, this.elements.userVisibleItem.selector, (elements) => {
            this.api.elementIdText(Object.values(elements.value[position])[0], (elementText) => {
                this.assert.equal(elementText.value.includes(id), true, `Expected roughly visible to ID "${id}", found "${elementText.value}"`);
            });
        });
        return this;
    },
    assertGroupVisibleToSize(size) {
        browser.elements(this.client.locateStrategy, this.elements.groupVisibleItem.selector, (elements) => {
            this.assert.equal(elements.value.length, size, `Expected group visible count of "${size}", found "${elements.value.length}"`);
        });
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
        browser.element("css selector", `#${groupID}`, (element) => {
            browser.elementIdClick(Object.values(element.value)[0]);
        });
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