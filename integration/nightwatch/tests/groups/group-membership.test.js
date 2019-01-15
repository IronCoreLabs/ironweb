module.exports = {
    tags: ['this'],
    beforeEach(browser){
        browser.url(browser.launchUrl);
        const demoApp = browser.page.demoApp();
        const {initializeUser} = demoApp.section;
        initializeUser.initializeAndSyncUser();
        demoApp.switchToGroubTabUI();
    },

    'User can remove themselves from a group member'(browser){
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
            .removeMemberAtPosition(0);

        //Wait for remove operation to complete before continuing
        browser.pause(350);

        groupDetail.assertGroupMemberSize(0);

        browser.end();
    },

    'Admin can add another admin to the group'(browser){
        const demoApp = browser.page.demoApp();
        const {groupList, groupCreate, groupDetail, commandBar, initializeUser} = demoApp.section;

        let firstUserID;

        commandBar.getUsersID((id) => {
            firstUserID = id;

            commandBar.resetApp();
            initializeUser.initializeAndSyncUser();

            demoApp.switchToGroubTabUI();

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
                .addNewAdminID(firstUserID)
                .submitNewAdmin()
                .assertGroupAdminSize(2);

            browser.end();
        });
    },

    'Admin can remove admins from the group'(browser){
        const demoApp = browser.page.demoApp();
        const {groupList, groupCreate, groupDetail, commandBar, initializeUser} = demoApp.section;

        let firstUserID;

        commandBar.getUsersID((id) => {
            firstUserID = id;

            commandBar.resetApp();
            initializeUser.initializeAndSyncUser();

            demoApp.switchToGroubTabUI();

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
                .addNewAdminID(firstUserID)
                .submitNewAdmin()
                .assertGroupAdminSize(2)
                .removeAdminAtPosition(1);

            //Wait for remove operation to complete before continuing
            browser.pause(350);
            groupDetail.assertGroupAdminSize(1);

            browser.end();
        });
    },

    'Admin can add another member to the group'(browser){
        const demoApp = browser.page.demoApp();
        const {groupList, groupCreate, groupDetail, commandBar, initializeUser} = demoApp.section;

        let firstUserID;

        commandBar.getUsersID((id) => {
            firstUserID = id;

            commandBar.resetApp();
            initializeUser.initializeAndSyncUser();

            demoApp.switchToGroubTabUI();

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
                .addNewMemberID(firstUserID)
                .submitNewMember()
                .assertGroupMemberSize(2);

            browser.end();
        });
    },

    'Group admin can remove other users from the group'(browser){
        const demoApp = browser.page.demoApp();
        const {groupList, groupCreate, groupDetail, commandBar, initializeUser} = demoApp.section;

        let firstUserID;

        commandBar.getUsersID((id) => {
            firstUserID = id;

            commandBar.resetApp();
            initializeUser.initializeAndSyncUser();

            demoApp.switchToGroubTabUI();

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
                .addNewMemberID(firstUserID)
                .submitNewMember()
                .assertGroupMemberSize(2)
                .removeMemberAtPosition(1)

            //Wait for remove operation to complete before continuing
            browser.pause(350);

            groupDetail.assertGroupMemberSize(1);

            browser.end();
        });
    },
};