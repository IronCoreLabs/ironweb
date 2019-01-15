/**
 * Actions for top command bar which includes app reset and local storage clearing buttons
 */
const commandBarActions = {
    resetApp(){
        return this.click('@resetApp').waitForElementPresent('@resetApp');
    },
    clearLocalDocs(){
        return this.click('@clearLocalDocsButton').waitForElementPresent('@resetApp');
    },
    clearSymmetricKey(){
        return this.click('@clearSymKeyButton').waitForElementPresent('@resetApp');
    },
    clearLocalDocumentsAndKeys(){
        return this.click('@clearAllButton').waitForElementPresent('@resetApp');
    },
    getUsersID(callback){
        return this.getText('@userID', (result) => {
            callback(result.value);
        });
    },
    clickChangePasscodeButton(){
        return this.click('@changePasscodeButton');
    }
};

const commandBarElements = {
    resetApp: {selector: '.reset-button'},
    clearLocalDocsButton: {selector: '.clear-local-docs'},
    clearSymKeyButton: {selector: '.clear-sym-key'},
    clearAllButton: {selector: '.clear-all'},
    userID: {selector: '.user-id'},
    changePasscodeButton: {selector: '.change-passcode'},
};

module.exports = {
    commands: [commandBarActions],
    elements: commandBarElements,
    selector: '.user-info',
};