import * as React from "react";
import Button from "@material-ui/core/Button";
import Dialog from "material-ui/Dialog";
import TextField from "material-ui/TextField";
import LoadingPlaceholder from "./LoadingPlaceholder";
import {LOCAL_DOC_STORAGE_KEY} from "../DocumentDB";
import * as IronWeb from "../../src/shim";
import {logAction} from "../Logger";

const componentStyle: React.CSSProperties = {
    position: "fixed",
    top: 0,
    left: 0,
    textAlign: "center",
    padding: "10px 0",
    width: "100%",
    backgroundColor: "#BCFFDB",
};

const buttonStyle: React.CSSProperties = {
    margin: "5px",
};

declare global {
    interface Window {
        User: {
            id: string;
            name: string;
        };
    }
}

interface UserInfoState {
    showingDialog: boolean;
    changingPasscode: boolean;
    passcodeError: boolean;
}

export default class UserInfo extends React.Component<Record<string, never>, UserInfoState> {
    currentPasscodeInput!: TextField;
    newPasscodeInput!: TextField;

    constructor(props: Record<string, never>) {
        super(props);
        this.state = {
            showingDialog: false,
            passcodeError: false,
            changingPasscode: false,
        };
    }

    changeUserPasscode = () => {
        const currentPasscode = this.currentPasscodeInput.getValue();
        const newPasscode = this.newPasscodeInput.getValue();

        if (!currentPasscode || !newPasscode) {
            return;
        }
        this.setState({
            passcodeError: false,
            changingPasscode: true,
        });
        IronWeb.user
            .changePasscode(currentPasscode, newPasscode)
            .then(() => {
                logAction("Successfully changed users passcode", "success");
                this.setState({showingDialog: false, changingPasscode: false});
            })
            .catch((error: IronWeb.SDKError) => {
                this.setState(
                    {
                        changingPasscode: false,
                        passcodeError: error.code === IronWeb.ErrorCodes.USER_PASSCODE_INCORRECT,
                    },
                    () => {
                        if (error.code === IronWeb.ErrorCodes.USER_PASSCODE_INCORRECT) {
                            if (this.currentPasscodeInput && this.newPasscodeInput) {
                                this.currentPasscodeInput.getInputNode().value = "";
                                this.newPasscodeInput.getInputNode().value = "";
                                this.currentPasscodeInput.focus();
                            }
                        }
                    }
                );
                logAction(`User passcode change error: ${error.message}. Error Code: ${error.code}`, "error");
            });
    };

    clearDeviceAndSigningKeys() {
        try {
            IronWeb.user.deauthorizeDevice().then((result) => {
                logAction(`User device successfully deauthorized. Deleted transform key: ${result.transformKeyDeleted}`);
                window.location.reload();
            });
        } catch (e: any) {
            logAction(`User device deauthorize error: ${e.message}. Error Code: ${e.code}`, "error");
        }
    }

    clearLocalSymmetricKey = () => {
        localStorage.removeItem("1-icldassk");
        window.location.reload();
    };

    clearLocalDocuments = () => {
        localStorage.removeItem(LOCAL_DOC_STORAGE_KEY);
        window.location.reload();
    };

    resetApp = () => {
        document.cookie = "integrationDemo=;expires=Thu, 01 Jan 1970 00:00:00 GMT";
        this.clearLocalDocuments();
        this.clearDeviceAndSigningKeys();
    };

    getPostInitializationButtons() {
        if (IronWeb.isInitialized()) {
            return [
                <Button variant="contained" key="device" className="clear-all" style={buttonStyle} onClick={this.clearDeviceAndSigningKeys}>
                    DeAuth Device
                </Button>,
                <Button
                    variant="contained"
                    key="changePasscode"
                    className="change-passcode"
                    style={buttonStyle}
                    onClick={() => this.setState({showingDialog: true})}>
                    Change Passcode
                </Button>,
            ];
        }
        return [];
    }

    getModalContent() {
        if (this.state.changingPasscode) {
            return <LoadingPlaceholder />;
        }
        const setCurrentPasscodeInput = (currentPasscodeInput: TextField) => {
            this.currentPasscodeInput = currentPasscodeInput;
        };
        const setNewPasscodeInput = (newPasscodeInput: TextField) => {
            this.newPasscodeInput = newPasscodeInput;
        };
        return (
            <div>
                <TextField
                    id="currentPasscode"
                    ref={setCurrentPasscodeInput}
                    hintText="Current Passcode"
                    autoFocus
                    errorText={this.state.passcodeError ? "Incorrect passcode" : ""}
                />
                <br />
                <TextField id="newPasscode" ref={setNewPasscodeInput} hintText="New Passcode" />
            </div>
        );
    }

    render() {
        const modalAction = [
            <Button key="passcode" className="submit-passcode-change" color="primary" onClick={this.changeUserPasscode}>
                Change Passcode
            </Button>,
        ];

        return (
            <div style={componentStyle} className="user-info">
                <div>{window.User.name}</div>
                <div className="user-id">{window.User.id}</div>
                <br />
                <Button variant="contained" className="reset-button" style={buttonStyle} onClick={this.resetApp}>
                    Reset App
                </Button>
                <Button variant="contained" key="docs" className="clear-local-docs" style={buttonStyle} onClick={this.clearLocalDocuments}>
                    Clear Local Docs
                </Button>
                <Button variant="contained" key="sym" className="clear-sym-key" style={buttonStyle} onClick={this.clearLocalSymmetricKey}>
                    Clear Sym Key
                </Button>
                {this.getPostInitializationButtons()}
                <Dialog
                    modal={false}
                    open={this.state.showingDialog}
                    title="Change Passcode"
                    onRequestClose={() => this.setState({showingDialog: false, passcodeError: false})}
                    actions={modalAction}
                    bodyClassName="password-change-dialog-body">
                    {this.getModalContent()}
                </Dialog>
            </div>
        );
    }
}
