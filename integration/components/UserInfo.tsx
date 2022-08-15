import * as React from "react";
import {Button, Dialog, DialogActions, DialogContent, TextField, TextFieldProps} from "@material-ui/core";
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
    currentPasscodeInput!: React.RefObject<TextFieldProps>;
    newPasscodeInput!: React.RefObject<TextFieldProps>;

    constructor(props: Record<string, never>) {
        super(props);
        this.state = {
            showingDialog: false,
            passcodeError: false,
            changingPasscode: false,
        };
    }

    changeUserPasscode = () => {
        const currentPasscode = this.currentPasscodeInput.current?.value as string;
        const newPasscode = this.newPasscodeInput.current?.value as string;

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
                                this.currentPasscodeInput.current!.value = "";
                                this.newPasscodeInput.current!.value = "";
                                (this.currentPasscodeInput.current as any).focus();
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
        const setCurrentPasscodeInput = (currentPasscodeInput: React.RefObject<TextFieldProps>) => {
            this.currentPasscodeInput = currentPasscodeInput;
        };
        const setNewPasscodeInput = (newPasscodeInput: React.RefObject<TextFieldProps>) => {
            this.newPasscodeInput = newPasscodeInput;
        };
        return (
            <div>
                <TextField
                    id="currentPasscode"
                    inputRef={setCurrentPasscodeInput}
                    helperText={this.state.passcodeError ? "Incorrect passcode" : "Current Passcode"}
                    autoFocus
                    error={this.state.passcodeError}
                />
                <br />
                <TextField id="newPasscode" inputRef={setNewPasscodeInput} helperText="New Passcode" />
            </div>
        );
    }

    render() {
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
                <Dialog open={this.state.showingDialog} title="Change Passcode" onClose={() => this.setState({showingDialog: false, passcodeError: false})}>
                    <DialogContent className="password-change-dialog-body">{this.getModalContent()}</DialogContent>
                    <DialogActions>
                        <Button key="passcode" className="submit-passcode-change" color="primary" onClick={this.changeUserPasscode}>
                            Change Passcode
                        </Button>
                    </DialogActions>
                </Dialog>
            </div>
        );
    }
}
