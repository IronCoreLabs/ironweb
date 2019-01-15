const groupListActions = {
    expectGroupRoleChipAtPosition(position, chipSelector, shouldExist = true){
        this.api.elements(this.client.locateStrategy, this.elements.groupItems.selector, (elements) => {
            this.api.elementIdElement(elements.value[position].ELEMENT, this.client.locateStrategy, chipSelector, (chipElement) => {
                if(shouldExist){
                    this.assert.equal(chipElement.status, 0, chipElement.status === -1 ? chipElement.value.message : "Found expected role chip");
                }
                else{
                    this.assert.equal(chipElement.status, -1, chipElement.status === 0 ? chipElement.value.message : "Found unexpected role chip");
                }
            });
        });
        return this;
    },
    switchToGroupUITab(){
        return this.click('@groupTabButton');
    },
    clickAddNewGroup(){
        return this.click('@createNewGroupButton');
    },
    expectCountOfGroups(length){
        this.api.elements(this.client.locateStrategy, this.elements.groupItems.selector, (elements) => {
            this.assert.equal(elements.value.length, length, `Expected group count of "${length}, found "${elements.value.length}"`);
        });
        return this;
    },
    expectGroupNameAtPosition(position, name){
        this.api.elements(this.client.locateStrategy, this.elements.groupItems.selector, (elements) => {
            this.api.elementIdText(elements.value[position].ELEMENT, (elementText) => {
                this.assert.equal(elementText.value.includes(name), true, `Expected roughly group name "${name}", found "${elementText.value}"`);
            });
        });
        return this;
    },
    expectGroupAdminChipAtPosition(position){
        return this.expectGroupRoleChipAtPosition(position, this.elements.adminChip.selector);
    },
    expectGroupMemberChipAtPosition(position){
        return this.expectGroupRoleChipAtPosition(position, this.elements.memberChip.selector);
    },
    expectNoGroupMemberChipAtPosition(position){
        return this.expectGroupRoleChipAtPosition(position, this.elements.memberChip.selector, false);
    },
    clickOnNthGroup(item){
        this.api.elements(this.client.locateStrategy, this.elements.groupItems.selector, (elements) => {
            this.api.elementIdClick(elements.value[item].ELEMENT);
        });
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