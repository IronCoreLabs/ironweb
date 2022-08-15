import {Tab, Tabs, TextField, Button, Grid} from "@material-ui/core";
import * as React from "react";
import * as IronWeb from "../../src/shim";
import {logAction} from "../Logger";
import {TabPanel} from "./TabPanel";

interface InitializeApiProps {
    onComplete: () => void;
}

interface InitializeApiState {
    showSetPasscode: boolean;
    passcode: string;
    tabIndex: number;
}

declare global {
    interface Window {
        User: {
            id: string;
            name: string;
        };
    }
}

export default class InitializeApi extends React.Component<InitializeApiProps, InitializeApiState> {
    passcodeCallback?: (passcode: string) => void;

    constructor(props: InitializeApiProps) {
        super(props);
        this.state = {
            showSetPasscode: false,
            passcode: "",
            tabIndex: 0,
        };
    }

    onPasscodeChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        this.setState({
            passcode: event.currentTarget.value,
        });
    };

    handleEnter = (event: React.KeyboardEvent<HTMLInputElement>) => {
        if (event.charCode === 13) {
            this.setPasscode();
        }
    };

    setPasscode = () => {
        if (this.state.passcode && this.passcodeCallback) {
            this.passcodeCallback(this.state.passcode);
        }
    };

    generateJWT(): Promise<string> {
        return fetch(`/generateJWT/${window.User.id}`)
            .then((response) => response.json())
            .then((jwt: string) => {
                logAction(`Got JWT token: ${jwt}`);
                return jwt;
            })
            .catch((error) => {
                logAction(`Failed to get JWT token: ${error.messsage}`, "error");
                return error;
            });
    }

    getUsersPasscode = (didUserExist: boolean): Promise<string> => {
        if (didUserExist) {
            logAction(`User exists, but no local keys. Need passcode in order to unlock user key to generate device/signing/transform key`);
        } else {
            logAction(`User doesn't exist. Need passcode to encrypt users private key before we create the user.`);
        }
        this.setState({showSetPasscode: true});
        //We need the users passcode so return a new Promise and store off the resolve function. We'll invoke it later once we have
        //the users passcode value.
        return new Promise((resolve) => {
            this.passcodeCallback = resolve;
        });
    };

    initialize = () => {
        logAction(`Calling SDK Init`);
        IronWeb.initialize(this.generateJWT, this.getUsersPasscode)
            .then((initializedResult) => {
                document.cookie = `integrationDemo=${JSON.stringify({id: window.User.id, name: window.User.name})};`;
                logAction(`Init complete. Initialized user ${initializedResult.user.id} who has status ${initializedResult.user.status}`, "success");
                if (initializedResult.user.needsRotation) {
                    logAction(`Rotating users key`);
                    return IronWeb.user.rotateMasterKey(this.state.passcode).then((res) => {
                        logAction(`Users master key rotated`);
                        logAction(JSON.stringify(res));
                        this.props.onComplete();
                    });
                } else {
                    this.props.onComplete();
                    return Promise.resolve();
                }
            })
            .catch((error: IronWeb.SDKError) => {
                logAction(`Initialize error: ${error.message}. Error Code: ${error.code}`, "error");
            });
    };

    getPasscodeInput(key: string) {
        return (
            <TextField
                key="passcode"
                id={`api-passcode-${key}`}
                autoFocus
                type="text"
                onKeyPress={this.handleEnter}
                helperText="Passcode"
                onChange={this.onPasscodeChange}
                value={this.state.passcode}
                variant="filled"
                size="small"
            />
        );
    }

    createUser = () => {
        logAction(`Creating user manually without device...`);
        IronWeb.createNewUser(this.generateJWT, this.state.passcode, {needsRotation: true})
            .then((res) => {
                logAction(`User manually created`, "success");
                logAction(JSON.stringify(res));
            })
            .catch((e) => logAction(`Failed to create user: '${e.message}'`, "error"));
    };

    createDevice = () => {
        logAction(`Creating device manually...`);
        IronWeb.createNewDeviceKeys(this.generateJWT, this.state.passcode)
            .then((res) => {
                logAction(`User device manually created`, "success");
                logAction(JSON.stringify(res));
            })
            .catch((e) => logAction(`Failed to create user device: '${e.message}'`, "error"));
    };

    getInitUIElement() {
        if (this.state.showSetPasscode) {
            return (
                <Grid container spacing={1}>
                    <Grid item xs={12}>
                        {this.getPasscodeInput("initialize")}
                    </Grid>
                    <Grid item xs={12}>
                        <Button variant="contained" className="set-passcode" key="set-passcode" color="secondary" onClick={this.setPasscode}>
                            Set Passcode
                        </Button>
                    </Grid>
                </Grid>
            );
        }
        return (
            <Grid container spacing={1}>
                <Grid item xs={12}>
                    <Button variant="contained" className="initialize-api-start" color="secondary" onClick={this.initialize}>
                        Initialize Api
                    </Button>
                </Grid>
            </Grid>
        );
    }

    render() {
        return (
            <>
                <Tabs
                    value={this.state.tabIndex}
                    style={{width: "350px"}}
                    className="initialize-api"
                    onChange={(_, newValue) => this.setState({passcode: "", tabIndex: newValue})}>
                    <Tab label="Initialize" />
                    <Tab label="Manual" />
                </Tabs>
                <TabPanel value={this.state.tabIndex} index={0}>
                    {this.getInitUIElement()}
                </TabPanel>
                <TabPanel value={this.state.tabIndex} index={1}>
                    <Grid container spacing={1}>
                        <Grid item xs={12}>
                            {this.getPasscodeInput("manual")}
                        </Grid>
                        <Grid item xs={12}>
                            <Button variant="contained" className="initialize-create-user" color="secondary" onClick={this.createUser}>
                                Create User
                            </Button>
                        </Grid>
                        <Grid item xs={12}>
                            <Button variant="contained" className="initialize-create-device" color="secondary" onClick={this.createDevice}>
                                Create Device
                            </Button>
                        </Grid>
                    </Grid>
                </TabPanel>
            </>
        );
    }
}
