import * as React from "react";
import * as IronWeb from "../../../src/shim";
import LoadingPlaceholder from "../LoadingPlaceholder";
import TextField from "material-ui/TextField";
import RaisedButton from "material-ui/RaisedButton";
import Checkbox from "material-ui/Checkbox";
import {logAction} from "../../Logger";
import {GroupMetaResponse, DocumentAccessResponse} from "../../../ironweb";

interface GrantDocumentAccessProps {
    listID: string;
    groupAccess: string[];
    refreshMetadata(): void;
}

interface GrantDocumentAccessState {
    availableGroups: GroupMetaResponse[];
    selectedGroups: string[];
    isGranting: boolean;
}

export default class GrantDocumentAccess extends React.Component<GrantDocumentAccessProps, GrantDocumentAccessState> {
    listInput!: TextField;

    constructor(props: GrantDocumentAccessProps) {
        super(props);
        this.state = {
            availableGroups: [],
            selectedGroups: [],
            isGranting: false,
        };
    }

    componentDidMount() {
        IronWeb.group
            .list()
            .then((groups) => {
                this.setState({availableGroups: groups.result.filter((group) => group.isMember)});
            })
            .catch((error: IronWeb.SDKError) => {
                logAction(`Group list failed: ${error.message}. Error Code: ${error.code}`, "error");
            });
    }

    onGroupGrantAccessToggle(groupID: string, _: any, isChecked: boolean) {
        if (isChecked) {
            this.setState({
                selectedGroups: [...this.state.selectedGroups, groupID],
            });
        } else {
            this.setState({
                selectedGroups: this.state.selectedGroups.filter((selectedGroup) => selectedGroup !== groupID),
            });
        }
    }

    grantListAccess = () => {
        const userIDList: string = this.listInput.getValue();
        if (!userIDList && !this.state.selectedGroups.length) {
            return;
        }
        const users = userIDList.split("\n").map((userID) => ({id: userID}));
        const groups = this.state.selectedGroups.map((groupID) => ({id: groupID}));
        logAction(
            `Calling grant access API with users [${users.map((user) => user.id)}], groups [${this.state.selectedGroups}] and doc ${this.props.listID}...`
        );
        this.setState({isGranting: true});
        IronWeb.document
            .grantAccess(this.props.listID, {users, groups})
            .then(this.logGrantResult)
            .catch((error: IronWeb.SDKError) => {
                logAction(`Grant access error: ${error.message}. Error Code: ${error.code}`, "error");
            });
    };

    logGrantResult = (accessResponse: DocumentAccessResponse) => {
        this.setState({isGranting: false});
        if (accessResponse.failed.length) {
            const list = accessResponse.failed.map((access) => `${access.type}:${access.id}:${access.error}`);
            logAction(`Document failed to be granted with [${list}]`, "error");
        }
        if (accessResponse.succeeded.length) {
            this.listInput.getInputNode().value = "";
            this.setState({
                selectedGroups: [],
            });

            const list = accessResponse.succeeded.map((access) => `${access.type}:${access.id}`);
            logAction(`Document successfully granted with [${list}]`, "success");
            this.props.refreshMetadata();
        }
    };

    setUserListRef = (input: TextField) => {
        this.listInput = input;
    };

    getGroupCheckboxes() {
        const groupCheckboxes = this.state.availableGroups.map(({groupID, groupName}) => {
            const alreadyHasAccess = this.props.groupAccess.indexOf(groupID) !== -1;
            return (
                <Checkbox
                    key={groupID}
                    id={groupID}
                    checked={alreadyHasAccess || this.state.selectedGroups.indexOf(groupID) > -1}
                    disabled={alreadyHasAccess}
                    label={groupName || ""}
                    onCheck={this.onGroupGrantAccessToggle.bind(this, groupID)}
                    style={{width: "50%"}}
                />
            );
        });
        return (
            <div
                style={{
                    display: "flex",
                    justifyContent: "space-around",
                    alignItems: "center",
                    flexDirection: "column",
                    maxHeight: "150px",
                    minHeight: "50px",
                    overflowY: "auto",
                }}>
                {groupCheckboxes}
            </div>
        );
    }

    render() {
        const submit = this.state.isGranting ? (
            <LoadingPlaceholder />
        ) : (
            <RaisedButton className="grant-access-submit" onClick={this.grantListAccess} label="Grant Todo List Access" secondary />
        );

        return (
            <div style={{textAlign: "center"}}>
                <TextField
                    ref={this.setUserListRef}
                    multiLine
                    id="userAccessID"
                    autoFocus
                    type="text"
                    hintText="User IDs to Grant Access To (1 per line)"
                    style={{width: "100%"}}
                />
                {this.getGroupCheckboxes()}
                <br />
                {submit}
            </div>
        );
    }
}
