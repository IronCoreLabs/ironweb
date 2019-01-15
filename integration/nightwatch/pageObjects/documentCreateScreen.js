/**
 * Actions for document create page view
 */
const documentCreateActions = {
    toggleStorage(){
        return this.click('@storageToggle');
    },
    submitDocument(){
        return this.click('@createNewDocumentButton').waitForElementNotPresent('@createNewDocumentButton');
    },
    setTodoListID(value){
        return this.setValue('@todoListIDInput', value);
    },
    setTodoListName(value){
        return this.setValue('@todoListNameInput', value);
    },
    setTodoListItem(value){
        return this.setValue('@todoItemInput', value);
    },
    enterUserIDToGrantAccess(id){
        return this.setValue('@userGrantInput', id);
    },
    clickOnGroupGrantAccessCheckbox(groupID){
        this.api.element(this.client.locateStrategy, `#${groupID}`, (element) => {
            this.api.elementIdClick(element.value.ELEMENT);
        })
        return this;
    },
}

const documentCreateElements = {
    storageToggle: '.storage-toggle',
    todoListIDInput: '#todo-id-input',
    todoListNameInput: '#todo-name-input',
    todoItemInput: '#todo-item-input-0',
    userGrantInput: {selector: '#userAccessID'},
    createNewDocumentButton: '.submit-new-document',
};

module.exports = {
    commands: [documentCreateActions],
    elements: documentCreateElements,
    selector: '.new-document',
};