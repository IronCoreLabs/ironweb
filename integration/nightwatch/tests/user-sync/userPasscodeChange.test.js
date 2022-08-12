module.exports = {
    "@tags": ["userPasscodeChange"],
    beforeEach(browser) {
        browser.url(browser.launchUrl);
    },

    "User can change passcode if they enter old one correctly"(browser) {
        const demoApp = browser.page.demoApp();
        const {commandBar, initializeUser} = demoApp.section;

        const firstPasscode = "first";
        const secondPasscode = "second";

        initializeUser.initializeAndSyncUser(firstPasscode);

        commandBar.clickChangePasscodeButton();

        demoApp.enterPasscodeFields(firstPasscode, secondPasscode).submitChangePasscode().waitForElementNotPresent("@passwordChangeDialog");

        commandBar.clearSymmetricKey();

        //Now the second passcode should work and take the user to the doc list page
        initializeUser.initializeAndSyncUser(secondPasscode);
        demoApp.assertOnDocumentListPage();

        browser.end();
    },

    "User passcode enter fails when using users old passcode"(browser) {
        const demoApp = browser.page.demoApp();
        const {commandBar, initializeUser} = demoApp.section;

        const firstPasscode = "first";
        const secondPasscode = "second";

        initializeUser.initializeAndSyncUser(firstPasscode);

        commandBar.clickChangePasscodeButton();

        demoApp.enterPasscodeFields(firstPasscode, secondPasscode).submitChangePasscode().waitForElementNotPresent("@passwordChangeDialog");

        commandBar.clearSymmetricKey();

        initializeUser.clickInitializeAppButton().enterUserPasscode(firstPasscode).submitPasscode();

        initializeUser.expect.element("@submitPasscode").to.not.have.value;

        browser.end();
    },

    "User passcode change fails when previous passcode is incorrect"(browser) {
        const demoApp = browser.page.demoApp();
        const {commandBar, initializeUser} = demoApp.section;

        const firstPasscode = "first";
        const secondPasscode = "second";

        initializeUser.initializeAndSyncUser(firstPasscode);

        commandBar.clickChangePasscodeButton();

        demoApp
            .enterPasscodeFields(secondPasscode, secondPasscode)
            .submitChangePasscode()
            .waitForElementPresent("@currentPasscodeInput")
            .expect.element("@currentPasscodeInput").to.not.have.value;

        browser.end();
    },
};