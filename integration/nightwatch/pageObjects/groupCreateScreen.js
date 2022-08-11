/**
 * Actions and assertions for group create screen to allow creating new groups with specific name and to toggle member addition
 */

const groupCreateActions = {
    enterGroupID(id) {
        return this.setValue("@groupIDInput", id);
    },
    enterGroupName(name) {
        return this.setValue("@groupNameInput", name);
    },
    toggleAddAsMember() {
        return this.click("@groupMemberToggle");
    },
    // WARNING: always use `groupCreateScreen.enterGroupID` when creating a group. Auto-generated group ids will
    // sometimes have leading numbers, making them invalid html IDs
    submitNewGroup() {
        return this.click("@groupCreateButton").waitForElementNotPresent("@groupCreateButton");
    },
};

const groupCreateElements = {
    groupIDInput: {selector: '#new-group-id'},
    groupNameInput: {selector: '#new-group-name'},
    groupMemberToggle: {selector: '.group-member-toggle'},
    groupCreateButton: {selector: '.submit-new-group'},
};

module.exports = {
    commands: [groupCreateActions],
    elements: groupCreateElements,
    selector: '.new-group',
};