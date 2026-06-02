/**
 * Actions and assertions for group detail screen to allow asserting the size of members and admins and to also add/remove members
 */

const groupDetailActions = {
    assertGroupID(id) {
        this.expect.element("@groupIDText").text.to.equal(`ID: ${id}`);
        return this;
    },
    assertGroupName(groupName) {
        this.expect.element("@groupNameText").value.to.equal(groupName);
        return this;
    },
    backToGroupList() {
        return this.click("@backToGroupListButton");
    },
    assertGroupMemberSize(length) {
        browser.waitForElementPresent(`css selector`, `.groupMembers[data-member-count="${length}"]`, 5000,
            `Expected member count of "${length}"`);
        return this;
    },
    assertGroupAdminSize(length) {
        browser.waitForElementPresent(`css selector`, `.groupAdmins[data-admin-count="${length}"]`, 5000,
            `Expected admin count of "${length}"`);
        return this;
    },
    addNewAdminID(id) {
        return this.setValue("@groupAdminInput", id);
    },
    submitNewAdmin() {
        return this.click("@groupAdminInput")
            .sendKeys("@groupAdminInput", browser.Keys.ENTER)
            .waitForElementPresent("@groupAdminInput");
    },
    addNewMemberID(id) {
        return this.setValue("@groupMemberInput", id);
    },
    submitNewMember() {
        return this.click("@groupMemberInput")
            .sendKeys("@groupMemberInput", browser.Keys.ENTER)
            .waitForElementPresent("@groupMemberInput");
    },
    removeMemberAtPosition(position) {
        browser.element.findAll(this.elements.groupRemoveMemberButton.selector).nth(position).click();
        return this;
    },
    removeAdminAtPosition(position) {
        browser.element.findAll(this.elements.groupRemoveAdminButton.selector).nth(position).click();
        return this;
    },
    getGroupID(callback) {
        return this.getText("@groupIDText", (result) => {
            callback(result.value.split(" ")[1]);
        });
    },
};

const groupDetailElements = {
    groupNameText: {selector: "#groupName"},
    groupIDText: {selector: ".group-id"},
    backToGroupListButton: {selector: ".back-to-group-list"},
    groupMemberListItem: {selector: ".group-member-user"},
    groupAdminListItem: {selector: ".group-admin-user"},
    groupMemberInput: {selector: "#newMemberInput"},
    groupAdminInput: {selector: "#newAdminInput"},
    groupRemoveAdminButton: {selector: ".group-remove-admin"},
    groupRemoveMemberButton: {selector: ".group-remove-member"},
    groupIDText: {selector: ".group-id"},
};

module.exports = {
    commands: [groupDetailActions],
    elements: groupDetailElements,
    selector: '.group-detail',
};