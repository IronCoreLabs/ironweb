import * as React from "react";
import TextField from "material-ui/TextField";
import RaisedButton from "material-ui/RaisedButton";
import {GroupMetaResponse} from "../../../ironweb";
import * as IronWeb from "../../../src/shim";
import {logAction} from "../../Logger";
import FloatingActionButton from "material-ui/FloatingActionButton";
import ArrowBack from "material-ui/svg-icons/navigation/arrow-back";
import Checkbox from "material-ui/Checkbox";

interface NewGroupProps {
    backToGroup(): void;
    onGroupSelect: (group: GroupMetaResponse) => void;
}

interface NewGroupState {
    isChecked: boolean;
}

export default class NewGroup extends React.Component<NewGroupProps, NewGroupState> {
    newGroupName!: TextField;
    newGroupID!: TextField;

    constructor(props: NewGroupProps) {
        super(props);
        this.state = {
            isChecked: true,
        };
    }

    createNewGroup = () => {
        const groupID = this.newGroupID.getValue();
        const groupName = this.newGroupName.getValue();
        logAction(`Creating group with ID '${groupID}' and name '${groupName}'`);
        IronWeb.group
            .create({groupID, groupName, addAsMember: this.state.isChecked})
            .then((group) => {
                logAction(`New group successfully created.`, "success");
                this.props.onGroupSelect(group);
            })
            .catch((error: IronWeb.SDKError) => {
                logAction(`Group create error: ${error.message}. Error Code: ${error.code}`, "error");
            });
    };

    setGroupNameRef = (input: TextField) => {
        this.newGroupName = input;
    };

    setGroupIDRef = (input: TextField) => {
        this.newGroupID = input;
    };

    render() {
        return (
            <div className="new-group">
                <div style={{display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", margin: "10px 0"}}>
                    <h1>New Group</h1>
                    <FloatingActionButton onClick={this.props.backToGroup} mini>
                        <ArrowBack />
                    </FloatingActionButton>
                </div>
                <div>
                    <TextField id="new-group-id" autoFocus ref={this.setGroupIDRef} type="text" hintText="Group ID" style={{width: "100%", fontSize: "22px"}} />
                    <TextField id="new-group-name" ref={this.setGroupNameRef} type="text" hintText="Group Name" style={{width: "100%", fontSize: "22px"}} />
                    <Checkbox
                        className="group-member-toggle"
                        checked={this.state.isChecked}
                        onCheck={() => this.setState({isChecked: !this.state.isChecked})}
                        label="Add yourself as a member"
                    />
                </div>
                <div style={{textAlign: "center", marginTop: "15px"}}>
                    <RaisedButton className="submit-new-group" onClick={this.createNewGroup} label="Create New Group" />
                </div>
            </div>
        );
    }
}
