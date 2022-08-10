/**
 * Actions for app startup initialize section
 */
const initializeActions = {
    clickInitializeAppButton(){
        return this.click("@initializeButton").waitForElementVisible("@enterPasscodeInput");
    },
    enterUserPasscode(passcode){
        return this.setValue('@enterPasscodeInput', passcode);
    },
    submitPasscode(){
        return this.click('@submitPasscode');
    },
    initializeAndSyncUser(passcode){
        const userPasscode = passcode || 'nightwatch';
        return this.waitForElementPresent('@initializeButton')
            .clickInitializeAppButton()
            .enterUserPasscode(userPasscode)
            .submitPasscode()
            .waitForElementNotPresent('@submitPasscode');

    },
};

const initializeElements = {
    initializeButton: {selector: '.initialize-api-start'},
    enterPasscodeInput: {selector: '#api-passcode'},
    submitPasscode: {selector: '.set-passcode'},
};

module.exports = {
    commands: [initializeActions],
    elements: initializeElements,
    selector: '.initialize-api',
}