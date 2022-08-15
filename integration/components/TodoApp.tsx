import Paper from "@material-ui/core/Paper";
import {createTheme, ThemeProvider} from "@material-ui/core/styles";
import * as React from "react";
import {DocumentIDNameResponse} from "../../ironweb";
import InitializeApi from "./InitializeApi";
import StatusConsole from "./StatusConsole";
import TabWrapper from "./TabWrapper";
import UserInfo from "./UserInfo";

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

export default class TodoApp extends React.Component<Record<string, never>, TodoAppState> {
    constructor(props: Record<string, never>) {
        super(props);
        this.state = {
            initComplete: false,
            selectedList: null,
        };
    }

    initializeComplete = () => {
        this.setState({initComplete: true});
    };

    render() {
        let content = <InitializeApi onComplete={this.initializeComplete} />;
        if (this.state.initComplete) {
            content = <TabWrapper />;
        }

        return (
            <div style={containerStyle}>
                <ThemeProvider theme={createTheme({})}>
                    <Paper style={appWrapperStyle} elevation={3}>
                        <UserInfo />
                        {content}
                        <StatusConsole />
                    </Paper>
                </ThemeProvider>
            </div>
        );
    }
}
