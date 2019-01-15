module.exports = {
    '@tags': ['userDeviceAdd'],
    beforeEach(browser){
        browser.url(browser.launchUrl);
    },

    'User device add works when passcode is correct'(browser){
        const demoApp = browser.page.demoApp();
        const {commandBar, initializeUser, documentList} = demoApp.section;

        const userPasscode = "test";

        initializeUser.initializeAndSyncUser(userPasscode);

        //Now clear the users keys so we have to enter their passcode again
        commandBar.clearSymmetricKey();
        initializeUser.initializeAndSyncUser(userPasscode);
        demoApp.assertOnDocumentListPage();

        browser.end();
    },

    'User device add fails when passcode entered is incorrect'(browser){
        const demoApp = browser.page.demoApp();
        const {commandBar, initializeUser, documentList} = demoApp.section;

        initializeUser.initializeAndSyncUser('passcode1');

        commandBar.clearSymmetricKey();

        initializeUser.clickInitializeAppButton()
            .enterUserPasscode('passcode2')
            .submitPasscode();

        initializeUser.expect.element('@submitPasscode').to.have.value.that.equals(null);

        browser.end();
    },
};