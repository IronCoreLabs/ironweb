/**
 * Top level page assertions to allow tests to assert the page they're on
 */
const pageAssertionCommands = {
    assertOnDocumentListPage(){
        return this.expect.element('@browserListPage').to.be.visible;
    },
    assertOnDocumentCreatePage(){
        return this.expect.element('@browserCreatePage').to.be.visible;
    },
    assertOnHostedDocumentViewPage(){
        return this.expect.element('@hostedDocumentView').to.be.visible;
    },
    assertOnLocalDocumentViewPage(){
        return this.expect.element('@localDocumentView').to.be.visible;
    },
    assertOnGroupListPage(){
        return this.expect.element('@groupList').to.be.visible;
    },
    assertOnGroupCreatePage(){
        return this.expect.element('@groupCreatePage').to.be.visible;
    },
    assertOnGroupDetailPage(){
        return this.expect.element('@groupDetailPage').to.be.visible;
    },
    switchToGroubTabUI(){
        return this.click('@groupTabButton');
    },
    switchToDocumentTabUI(){
        return this.click('@documentTabButton');
    },
    enterPasscodeFields(currentPasscode, newPasscode){
        return this
            .setValue('@currentPasscodeInput', currentPasscode)
            .setValue('@newPasscodeInput', newPasscode);
    },
    submitChangePasscode(){
        return this.click('@submitPasscodeChangeButton');
    }
};

const pageElements = {
    browserListPage: {selector: '.document-list'},
    browserCreatePage: {selector: '.new-document'},
    hostedDocumentView: {selector: '.hosted-document'},
    localDocumentView: {selector: '.local-document'},
    groupList: {selector: '.group-list'},
    groupCreatePage: {selector: '.new-group'},
    groupDetailPage: {selector: '.group-detail'},
    groupTabButton: {selector: '.group-tab'},
    documentTabButton: {selector: '.document-tab'},
    currentPasscodeInput: {selector: '#currentPasscode'},
    newPasscodeInput: {selector: '#newPasscode'},
    submitPasscodeChangeButton: {selector: '.submit-passcode-change'},
    passwordChangeDialog: {selector: '.password-change-dialog-body'}
};

module.exports = {
    commands: pageAssertionCommands,
    elements: pageElements,
};