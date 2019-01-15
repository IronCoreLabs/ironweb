import * as React from "react";
import {subscribe, LogItem} from "../Logger";

const containerStyle: React.CSSProperties = {
    position: "fixed",
    width: "100%",
    bottom: 0,
    left: 0,
    textAlign: "left",
    margin: "3px",
    padding: "7px",
    borderTop: "1px solid #000",
    overflowY: "auto",
    height: "140px",
    backgroundColor: "#FFFBFC",
};

const infoLogStyle: React.CSSProperties = {
    width: "99%",
    overflow: "hidden",
    padding: "4px",
    borderBottom: "1px dotted #EFF0F1",
    fontFamily: 'Lucida Console", Courier, monospace',
};
const successLogStyle: React.CSSProperties = {
    ...infoLogStyle,
    color: "#61E786",
};
const errorLogStyle: React.CSSProperties = {
    ...infoLogStyle,
    color: "#E86C55",
};

interface StatusConsoleState {
    logList: LogItem[];
}

export default class StatusConsole extends React.Component<{}, StatusConsoleState> {
    logContainer!: HTMLDivElement;

    constructor(props: {}) {
        super(props);
        this.state = {
            logList: [],
        };
    }

    componentDidMount() {
        subscribe(this.addLog);
    }

    componentDidUpdate() {
        this.logContainer.scrollTop = this.logContainer.scrollHeight;
    }

    addLog = (log: LogItem | LogItem[]) => {
        this.setState((currentState: StatusConsoleState) => {
            const newLog = Array.isArray(log) ? log : [log];
            return {
                ...currentState,
                logList: [...currentState.logList, ...newLog],
            };
        });
    };

    getLogList() {
        return this.state.logList.map((log, index) => {
            const logStyle = log.type === "error" ? errorLogStyle : log.type === "success" ? successLogStyle : infoLogStyle;

            return <div key={index} style={logStyle}>{`❯ ${log.message}`}</div>;
        });
    }

    setContainerRef = (element: HTMLDivElement) => {
        this.logContainer = element;
    };

    render() {
        return (
            <div style={containerStyle} ref={this.setContainerRef}>
                {this.getLogList()}
            </div>
        );
    }
}
