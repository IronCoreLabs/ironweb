/**
 * Actions for app startup initialize section
 */
const initializeActions = {
    clickInitializeAppButton() {
        browser
            .click(this.client.locateStrategy, this.elements.initializeButton.selector)
            .waitForElementVisible(this.client.locateStrategy, this.elements.enterPasscodeInput.selector);
        return this;
    },
    enterUserPasscode(passcode) {
        browser.setValue(this.client.locateStrategy, this.elements.enterPasscodeInput.selector, passcode);
        return this;
    },
    submitPasscode() {
        browser.click(this.client.locateStrategy, this.elements.submitPasscode.selector);
        return this;
    },
    initializeAndSyncUser(passcode) {
        const userPasscode = passcode || "nightwatch";
        browser.waitForElementPresent(this.client.locateStrategy, this.elements.initializeButton.selector);
        this.clickInitializeAppButton()
            .enterUserPasscode(userPasscode)
            .submitPasscode()
            .waitForElementNotPresent(this.client.locateStrategy, this.elements.submitPasscode.selector);
        return this;
    },
};

const initializeElements = {
    initializeButton: {selector: ".initialize-api-start"},
    enterPasscodeInput: {selector: "#api-passcode-initialize"},
    submitPasscode: {selector: ".set-passcode"},
};

module.exports = {
    commands: [initializeActions],
    elements: initializeElements,
    selector: '.initialize-api',
}