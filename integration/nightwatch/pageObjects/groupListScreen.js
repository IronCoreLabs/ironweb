const groupListActions = {
    expectGroupRoleChipAtPosition(position, chipSelector, shouldExist = true) {
        browser.elements(this.client.locateStrategy, this.elements.groupItems.selector, (elements) => {
            browser.elementIdElement(Object.values(elements.value[position])[0], this.client.locateStrategy, chipSelector, (chipElement) => {
                if (shouldExist) {
                    if (Array.isArray(chipElement.value)) {
                        this.assert.equal(true, false, "Expected role chip not found");
                    } else if (typeof chipElement.value === "object") {
                        this.assert.equal(true, true, "Found expected role chip");
                    }
                } else {
                    if (Array.isArray(chipElement.value)) {
                        this.assert.equal(true, true, "Role chip not found as expected");
                    } else if (typeof chipElement.value === "object") {
                        this.assert.equal(true, false, "Found unexpected role chip");
                    }
                }
            });
        });
        return this;
    },
    switchToGroupUITab() {
        return this.click("@groupTabButton");
    },
    clickAddNewGroup() {
        return this.click("@createNewGroupButton");
    },
    expectCountOfGroups(length) {
        browser.elements(this.client.locateStrategy, this.elements.groupItems.selector, (elements) => {
            this.assert.equal(elements.value.length, length, `Expected group count of "${length}, found "${elements.value.length}"`);
        });
        return this;
    },
    expectGroupNameAtPosition(position, name) {
        browser.elements(this.client.locateStrategy, this.elements.groupItems.selector, (elements) => {
            this.api.elementIdText(Object.values(elements.value[position])[0], (elementText) => {
                this.assert.equal(elementText.value.includes(name), true, `Expected roughly group name "${name}", found "${elementText.value}"`);
            });
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
        browser.elements(this.client.locateStrategy, this.elements.groupItems.selector, (elements) => {
            this.api.elementIdClick(Object.values(elements.value[item])[0]);
        });
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