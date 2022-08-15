import * as React from "react";
import {TextField, TextFieldProps, Button, Checkbox, Fab, FormControlLabel} from "@material-ui/core";
import {GroupMetaResponse} from "../../../ironweb";
import * as IronWeb from "../../../src/shim";
import {logAction} from "../../Logger";
import {ArrowBack} from "@material-ui/icons";

interface NewGroupProps {
    backToGroup(): void;
    onGroupSelect: (group: GroupMetaResponse) => void;
}

interface NewGroupState {
    isAddAsMemberChecked: boolean;
    isNeedsRotationChecked: boolean;
}

export default class NewGroup extends React.Component<NewGroupProps, NewGroupState> {
    newGroupName!: React.RefObject<TextFieldProps>;
    newGroupID!: React.RefObject<TextFieldProps>;

    constructor(props: NewGroupProps) {
        super(props);
        this.state = {
            isAddAsMemberChecked: true,
            isNeedsRotationChecked: false,
        };
    }

    createNewGroup = () => {
        const groupID = this.newGroupID.current?.value as string;
        const groupName = this.newGroupName.current?.value as string;
        logAction(`Creating group with ID '${groupID}' and name '${groupName}'`);
        IronWeb.group
            .create({groupID, groupName, addAsMember: this.state.isAddAsMemberChecked, needsRotation: this.state.isNeedsRotationChecked})
            .then((group) => {
                logAction(`New group successfully created.`, "success");
                this.props.onGroupSelect(group);
            })
            .catch((error: IronWeb.SDKError) => {
                logAction(`Group create error: ${error.message}. Error Code: ${error.code}`, "error");
            });
    };

    setGroupNameRef = (input: React.RefObject<TextFieldProps>) => {
        this.newGroupName = input;
    };

    setGroupIDRef = (input: React.RefObject<TextFieldProps>) => {
        this.newGroupID = input;
    };

    render() {
        return (
            <div className="new-group">
                <div style={{display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", margin: "10px 0"}}>
                    <h1>New Group</h1>
                    <Fab onClick={this.props.backToGroup} size="small">
                        <ArrowBack />
                    </Fab>
                </div>
                <div>
                    <TextField
                        id="new-group-id"
                        autoFocus
                        inputRef={this.setGroupIDRef}
                        type="text"
                        helperText="Group ID"
                        style={{width: "100%", fontSize: "22px"}}
                    />
                    <TextField
                        id="new-group-name"
                        inputRef={this.setGroupNameRef}
                        type="text"
                        helperText="Group Name"
                        style={{width: "100%", fontSize: "22px"}}
                    />
                    <FormControlLabel
                        label="Add yourself as a member"
                        control={
                            <Checkbox
                                className="group-member-toggle"
                                checked={this.state.isAddAsMemberChecked}
                                onChange={() => this.setState({isAddAsMemberChecked: !this.state.isAddAsMemberChecked})}
                            />
                        }
                    />
                    <FormControlLabel
                        label="Create group with pending private key rotation"
                        control={
                            <Checkbox
                                className="group-rotate-toggle"
                                checked={this.state.isNeedsRotationChecked}
                                onChange={() => this.setState({isNeedsRotationChecked: !this.state.isNeedsRotationChecked})}
                            />
                        }
                    />
                </div>
                <div style={{textAlign: "center", marginTop: "15px"}}>
                    <Button variant="contained" className="submit-new-group" onClick={this.createNewGroup}>
                        Create New Group
                    </Button>
                </div>
            </div>
        );
    }
}
