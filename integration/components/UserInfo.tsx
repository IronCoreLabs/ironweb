import * as React from "react";
import RaisedButton from "material-ui/RaisedButton";
import FlatButton from "material-ui/FlatButton";
import Dialog from "material-ui/Dialog";
import TextField from "material-ui/TextField";
import LoadingPlaceholder from "./LoadingPlaceholder";
import {LOCAL_DOC_STORAGE_KEY} from "../DocumentDB";
import * as IronWeb from "../../src/shim";
import {logAction} from "../Logger";
import {Base64String, UserDevice} from "../../ironweb";

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
    changingPasscode: boolean;
    passcodeError: boolean;
    listingDevices: boolean;
    loading: boolean;
    deviceList: UserDevice[];
}

export default class UserInfo extends React.Component<Record<string, never>, UserInfoState> {
    currentPasscodeInput!: TextField;
    newPasscodeInput!: TextField;

    constructor(props: Record<string, never>) {
        super(props);
        this.state = {
            passcodeError: false,
            changingPasscode: false,
            listingDevices: false,
            loading: true,
            deviceList: [],
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
            loading: true,
        });
        IronWeb.user
            .changePasscode(currentPasscode, newPasscode)
            .then(() => {
                logAction("Successfully changed users passcode", "success");
                this.setState({loading: false, changingPasscode: false});
            })
            .catch((error: IronWeb.SDKError) => {
                this.setState(
                    {
                        loading: false,
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
            IronWeb.user.deleteDevice().then(() => {
                logAction(`User's device successfully deauthorized.`);
                window.location.reload();
            });
        } catch (e: any) {
            logAction(`User device deauthorize error: ${e.message}. Error Code: ${e.code}`, "error");
        }
    }

    deleteDevice(publicSigningKey: Base64String) {
        try {
            IronWeb.user.deleteDeviceByPublicSigningKey(publicSigningKey).then(() => {
                logAction(`User's device successfully deleted.`);
                this.listDevices();
            });
        } catch (e: any) {
            logAction(`User device delete error: ${e.message}. Error Code: ${e.code}`, "error");
        }
    }

    listDevices() {
        try {
            this.setState({loading: true});
            IronWeb.user.listDevices().then((result) => {
                this.setState({loading: false, deviceList: result.result});
            });
        } catch (e: any) {
            this.setState({loading: false});
            logAction(`User device list error: ${e.message}. Error Code: ${e.code}`, "error");
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
                <RaisedButton key="device" className="clear-all" style={buttonStyle} onClick={this.clearDeviceAndSigningKeys} label="DeAuth Device" />,
                <RaisedButton
                    key="changePasscode"
                    className="change-passcode"
                    style={buttonStyle}
                    onClick={() => this.setState({changingPasscode: true})}
                    label="Change Passcode"
                />,
                <RaisedButton
                    key="deviceList"
                    className="clear-all"
                    style={buttonStyle}
                    onClick={() => {
                        this.setState({
                            listingDevices: true,
                            deviceList: [],
                        });
                        this.listDevices();
                    }}
                    label="List Devices"
                />,
            ];
        }
        return [];
    }

    getPasswordChangeContent() {
        if (this.state.loading) {
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

    getDeviceListContent() {
        if (this.state.loading) {
            return <LoadingPlaceholder />;
        }

        if (this.state.deviceList.length !== 0) {
            return (
                <div>
                    {this.state.deviceList
                        .map((device, index) => (
                            <ul key={index}>
                                <li>Name: {String(device.name)}</li>
                                <li>ID: {device.id}</li>
                                <li>Current Device: {String(device.isCurrentDevice)}</li>
                                <li>Public Signing Key: {device.publicSigningKey}</li>
                                <li>Created: {device.created}</li>
                                <li>Updated: {device.updated}</li>
                                <RaisedButton onClick={() => this.deleteDevice(device.publicSigningKey)}>Delete Device</RaisedButton>
                            </ul>
                        ))
                        .flatMap((e, index) => [<hr key={index} />, e])
                        .slice(1)}
                </div>
            );
        } else {
            return <div>No devices found.</div>;
        }
    }

    render() {
        const modalAction = [
            <FlatButton key="passcode" className="submit-passcode-change" label="Change Passcode" primary onClick={this.changeUserPasscode} />,
        ];

        return (
            <div style={componentStyle} className="user-info">
                <div>{window.User.name}</div>
                <div className="user-id">{window.User.id}</div>
                <br />
                <RaisedButton className="reset-button" style={buttonStyle} onClick={this.resetApp} label="Reset App" />
                <RaisedButton key="docs" className="clear-local-docs" style={buttonStyle} onClick={this.clearLocalDocuments} label="Clear Local Docs" />
                <RaisedButton key="sym" className="clear-sym-key" style={buttonStyle} onClick={this.clearLocalSymmetricKey} label="Clear Sym Key" />
                {this.getPostInitializationButtons()}
                <Dialog
                    modal={false}
                    open={this.state.changingPasscode}
                    title={"Change Passcode"}
                    onRequestClose={() => this.setState({changingPasscode: false, passcodeError: false})}
                    actions={modalAction}
                    bodyClassName="password-change-dialog-body">
                    {this.getPasswordChangeContent()}
                </Dialog>
                <Dialog
                    modal={false}
                    open={this.state.listingDevices}
                    title={"User Device List"}
                    onRequestClose={() => this.setState({listingDevices: false, deviceList: []})}
                    bodyClassName="password-change-dialog-body">
                    {this.getDeviceListContent()}
                </Dialog>
            </div>
        );
    }
}
