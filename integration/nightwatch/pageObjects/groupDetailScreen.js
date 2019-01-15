/**
 * Actions and assertions for group detail screen to allow asserting the size of members and admins and to also add/remove members
 */

const groupDetailActions = {
    assertGroupID(id){
        this.expect.element('@groupIDText').text.to.equal(`ID: ${id}`);
        return this;
    },
    assertGroupName(groupName){
        this.expect.element('@groupNameText').text.to.equal(groupName);
        return this;
    },
    backToGroupList(){
        return this.click('@backToGroupListButton');
    },
    assertGroupMemberSize(length){
        this.api.elements(this.client.locateStrategy, this.elements.groupMemberListItem.selector, (elements) => {
            this.assert.equal(elements.value.length, length, `Expected member count of "${length}", found "${elements.value.length}"`);
        });
        return this;
    },
    assertGroupAdminSize(length){
        this.api.elements(this.client.locateStrategy, this.elements.groupAdminListItem.selector, (elements) => {
            this.assert.equal(elements.value.length, length, `Expected admin count of "${length}", found "${elements.value.length}"`);
        });
        return this;
    },
    addNewAdminID(id){
        return this.setValue('@groupAdminInput', id);
    },
    submitNewAdmin(){
        this.api.elementIdClick(this.elements.groupAdminInput.selector, () => {
            this.api.keys(this.api.Keys.ENTER);
            this.waitForElementPresent('@groupAdminInput');
        });
        return this;
    },
    addNewMemberID(id){
        return this.setValue('@groupMemberInput', id);
    },
    submitNewMember(){
        this.api.elementIdClick(this.elements.groupMemberInput.selector, () => {
            this.api.keys(this.api.Keys.ENTER);
            this.waitForElementPresent('@groupMemberInput');
        });
        return this;
    },
    removeMemberAtPosition(position){
        this.api.elements(this.client.locateStrategy, this.elements.groupRemoveMemberButton.selector, (elements) => {
            this.api.elementIdClick(elements.value[position].ELEMENT);
        })
        return this;
    },
    removeAdminAtPosition(position){
        this.api.elements(this.client.locateStrategy, this.elements.groupRemoveAdminButton.selector, (elements) => {
            this.api.elementIdClick(elements.value[position].ELEMENT);
        });
        return this;
    },
    getGroupID(callback){
        return this.getText('@groupIDText', (result) => {
            callback(result.value);
        });
    },
}

const groupDetailElements = {
    groupNameText: {selector: '.group-name'},
    groupIDText: {selector: '.group-id'},
    backToGroupListButton: {selector: '.back-to-group-list'},
    groupMemberListItem: {selector: '.group-member-user'},
    groupAdminListItem: {selector: '.group-admin-user'},
    groupMemberInput: {selector: '#newMemberInput'},
    groupAdminInput: {selector: '#newAdminInput'},
    groupRemoveAdminButton: {selector: '.group-remove-admin'},
    groupRemoveMemberButton: {selector: '.group-remove-member'},
    groupIDText: {selector: '.group-id'},
};

module.exports = {
    commands: [groupDetailActions],
    elements: groupDetailElements,
    selector: '.group-detail',
};