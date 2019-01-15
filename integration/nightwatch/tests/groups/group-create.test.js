module.exports = {
    '@tags': ['groupCreate'],
    beforeEach(browser){
        browser.url(browser.launchUrl);
        const demoApp = browser.page.demoApp();
        const {initializeUser} = demoApp.section;
        initializeUser.initializeAndSyncUser();
        demoApp.switchToGroubTabUI();
    },

    'Can add new group with user as a member and member and admin role show up as expected'(browser){
        const demoApp = browser.page.demoApp();
        const {groupList, groupCreate, groupDetail} = demoApp.section;

        const groupName = "nightwatch group";

        groupList.clickAddNewGroup()
        demoApp.assertOnGroupCreatePage();

        groupCreate
            .enterGroupName(groupName)
            .submitNewGroup();

        demoApp.assertOnGroupDetailPage();

        groupDetail
            .assertGroupName(groupName)
            .assertGroupMemberSize(1)
            .assertGroupAdminSize(1)
            .backToGroupList()

        demoApp.assertOnGroupListPage();

        groupList
            .expectCountOfGroups(1)
            .expectGroupNameAtPosition(0, groupName)
            .expectGroupAdminChipAtPosition(0)
            .expectGroupMemberChipAtPosition(0)
            .clickOnNthGroup(0);

        demoApp.assertOnGroupDetailPage();

        browser.end();
    },

    'Can add new group with own provided ID'(browser){
        const demoApp = browser.page.demoApp();
        const {groupList, groupCreate, groupDetail} = demoApp.section;

        const groupID = 'myGroup-' + Date.now();
        const groupName = "nightwatch group";

        groupList.clickAddNewGroup()
        demoApp.assertOnGroupCreatePage();

        groupCreate
            .enterGroupID(groupID)
            .enterGroupName(groupName)
            .submitNewGroup();

        demoApp.assertOnGroupDetailPage();

        groupDetail
            .assertGroupID(groupID)
            .assertGroupName(groupName)
            .assertGroupMemberSize(1)
            .assertGroupAdminSize(1);

        browser.end();
    },

    'Can add new group with name not as a member and user does not exist in member list'(browser){
        const demoApp = browser.page.demoApp();
        const {groupList, groupCreate, groupDetail} = demoApp.section;

        const groupName = "nightwatch group";

        groupList.clickAddNewGroup()
        demoApp.assertOnGroupCreatePage();

        groupCreate
            .enterGroupName(groupName)
            .toggleAddAsMember()
            .submitNewGroup();

        demoApp.assertOnGroupDetailPage();

        groupDetail
            .assertGroupName(groupName)
            .assertGroupMemberSize(0)
            .assertGroupAdminSize(1)
            .backToGroupList();

        demoApp.assertOnGroupListPage();

        groupList
            .expectCountOfGroups(1)
            .expectGroupNameAtPosition(0, groupName)
            .expectGroupAdminChipAtPosition(0)
            .expectNoGroupMemberChipAtPosition(0)
            .clickOnNthGroup(0);

        demoApp.assertOnGroupDetailPage();

        browser.end();
    },
};