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
        demoApp.waitForElementVisible("@currentPasscodeInput");

        demoApp.enterPasscodeFields(firstPasscode, secondPasscode).submitChangePasscode().waitForElementNotPresent("@passwordChangeDialog", 15000);

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
        demoApp.waitForElementVisible("@currentPasscodeInput");

        demoApp.enterPasscodeFields(firstPasscode, secondPasscode).submitChangePasscode().waitForElementNotPresent("@passwordChangeDialog", 15000);

        commandBar.clearSymmetricKey();

        initializeUser.clickInitializeAppButton().enterUserPasscode(firstPasscode).submitPasscode();

        // The old passcode must be rejected by SDK init, so the user should remain on the
        // initialize screen and never reach the document list page. Pause briefly to let the
        // async init promise reject before we assert.
        browser.pause(2000);
        demoApp.expect.element("@browserListPage").to.not.be.present;
        initializeUser.expect.element("@submitPasscode").to.be.visible;

        browser.end();
    },

    "User passcode change fails when previous passcode is incorrect"(browser) {
        const demoApp = browser.page.demoApp();
        const {commandBar, initializeUser} = demoApp.section;

        const firstPasscode = "first";
        const secondPasscode = "second";

        initializeUser.initializeAndSyncUser(firstPasscode);

        commandBar.clickChangePasscodeButton();
        demoApp.waitForElementPresent("@passwordChangeDialog");

        demoApp
            .enterPasscodeFields(secondPasscode, secondPasscode)
            .submitChangePasscode()
            .waitForElementPresent("@passwordChangeDialog");
        // On a wrong current passcode, the SDK rejects the change and the component renders
        // an "Incorrect passcode" error inside the dialog. That message is what proves this 
        // specific failure path ran.
        demoApp.expect.element("@passwordChangeDialog").text.to.contain("Incorrect passcode");

        browser.end();
    },
};
