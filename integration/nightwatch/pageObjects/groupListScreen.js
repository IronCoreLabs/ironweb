const groupListActions = {
    expectGroupRoleChipAtPosition(position, chipSelector, shouldExist = true) {
        const item = browser.element.findAll(this.elements.groupItems.selector).nth(position);
        if (shouldExist) {
            item.find(chipSelector).assert.present(`Expected role chip "${chipSelector}" at group position ${position}`);
        } else {
            item.findAll(chipSelector).count().assert.equals(0, `Expected no role chip "${chipSelector}" at group position ${position}`);
        }
        return this;
    },
    switchToGroupUITab() {
        return this.click("@groupTabButton");
    },
    clickAddNewGroup() {
        return this.click("@createNewGroupButton");
    },
    expectCountOfGroups(length) {
        browser.waitForElementPresent('css selector', `.group-list[data-group-count="${length}"]`, 5000,
            `Expected group count of "${length}"`);
        return this;
    },
    expectGroupNameAtPosition(position, name) {
        browser.element.findAll(this.elements.groupItems.selector).nth(position).getText((result) => {
            this.assert.equal(result.value.includes(name), true, `Expected roughly group name "${name}", found "${result.value}"`);
        });
        return this;
    },
    expectGroupAdminChipAtPosition(position) {
        return this.expectGroupRoleChipAtPosition(position, this.elements.adminChip.selector);
    },
    expectGroupMemberChipAtPosition(position) {
        return this.expectGroupRoleChipAtPosition(position, this.elements.memberChip.selector);
    },
    expectNoGroupMemberChipAtPosition(position) {
        return this.expectGroupRoleChipAtPosition(position, this.elements.memberChip.selector, false);
    },
    clickOnNthGroup(item) {
        browser.element.findAll(this.elements.groupItems.selector).nth(item).click();
        return this;
    },
    refreshList() {
        return this.click("@refreshGroupListButton");
    },
};

const groupListElements = {
    groupTabButton: {selector: '.group-tab'},
    refreshGroupListButton: {selector: '.refresh-group-list'},
    createNewGroupButton: {selector: '.add-new-group'},
    groupItems: {selector: '.group-list-item'},
    memberChip: {selector: '.group-member-chip'},
    adminChip: {selector: '.group-admin-chip'},
};

module.exports = {
    commands: [groupListActions],
    elements: groupListElements,
    selector: '.group-list',
};