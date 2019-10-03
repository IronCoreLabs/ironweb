import * as React from "react";
import MuiThemeProvider from "material-ui/styles/MuiThemeProvider";
import Paper from "material-ui/Paper";
import {DocumentIDNameResponse} from "../../ironweb";
import InitializeApi from "./InitializeApi";
import TabWrapper from "./TabWrapper";
import UserInfo from "./UserInfo";
import StatusConsole from "./StatusConsole";
import * as IronWeb from "../../src/shim";

const containerStyle: React.CSSProperties = {
    height: "100%",
    backgroundColor: "#2F4858",
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
};

const appWrapperStyle: React.CSSProperties = {
    backgroundColor: "#c7d5d8",
    borderRadius: "3px",
    padding: "0",
    textAlign: "center",
};

interface TodoAppState {
    initComplete: boolean;
    selectedList: null | DocumentIDNameResponse;
}

export default class TodoApp extends React.Component<{}, TodoAppState> {
    constructor(props: {}) {
        super(props);
        this.state = {
            initComplete: false,
            selectedList: null,
        };
    }

    initializeComplete = () => {
        console.log("Starting");
        IronWeb.document.advanced
            .encryptUnmanaged(new Uint8Array([1, 2, 3]))
            .then((encrypted) => {
                console.log(encrypted.document);
                return IronWeb.document.advanced.decryptUnmanaged(encrypted.document, encrypted.edeks);
            })
            .then((end) => {
                console.log(end);
            });
        this.setState({initComplete: true});
    };

    render() {
        let content = <InitializeApi onComplete={this.initializeComplete} />;
        if (this.state.initComplete) {
            content = <TabWrapper />;
        }

        return (
            <div style={containerStyle}>
                <MuiThemeProvider>
                    <Paper style={appWrapperStyle} zDepth={3}>
                        <UserInfo />
                        {content}
                        <StatusConsole />
                    </Paper>
                </MuiThemeProvider>
            </div>
        );
    }
}
