import * as React from "react";
import * as IronWeb from "../../../src/shim";
import {logAction} from "../../Logger";
import LoadingPlaceholder from "../LoadingPlaceholder";
import {List, ListItem} from "material-ui/List";
import TextField from "material-ui/TextField";
import IconButton from "material-ui/IconButton";
import Star from "material-ui/svg-icons/toggle/star";
import Person from "material-ui/svg-icons/social/person";
import LeaveGroup from "material-ui/svg-icons/action/open-in-new";
import {cyan500} from "material-ui/styles/colors";

interface GroupMembersProps {
    groupID: string;
    isAdmin: boolean;
    groupMembers: string[];
    backToList: () => void;
}

interface GroupMembersState {
    addingMembers: boolean;
    groupMembers: string[];
}

const listStyles: React.CSSProperties = {
    maxHeight: "250px",
    minHeight: "10px",
    overflowY: "auto",
    overflowX: "hidden",
    backgroundColor: "#f5f5f5",
    padding: "4px 0",
    marginBottom: "10px",
};

export default class GroupMembers extends React.Component<GroupMembersProps, GroupMembersState> {
    newMemberInput!: TextField;

    constructor(props: GroupMembersProps) {
        super(props);
        this.state = {
            addingMembers: false,
            groupMembers: props.groupMembers,
        };
    }

    UNSAFE_componentWillReceiveProps(nextProps: GroupMembersProps) {
        this.setState({groupMembers: nextProps.groupMembers});
    }

    setMemberRef = (newMemberInput: TextField) => {
        this.newMemberInput = newMemberInput;
    };

    addMember = () => {
        const memberValue = this.newMemberInput.getValue();
        if (!memberValue) {
            return;
        }
        this.setState({addingMembers: true});
        IronWeb.group
            .addMembers(this.props.groupID, [memberValue])
            .then((addResult) => {
                if (addResult.succeeded.length) {
                    this.setState({
                        groupMembers: [...this.state.groupMembers, ...addResult.succeeded],
                    });
                    logAction(`Added users ${addResult.succeeded} as member(s) of the group ${this.props.groupID}`, "success");
                }
                if (addResult.failed.length) {
                    logAction(`Failed to add users '${addResult.failed.map(({id}) => id)}' as member(s) to the group ${this.props.groupID}`, "error");
                }
                this.setState({addingMembers: false}, () => {
                    this.newMemberInput.getInputNode().value = "";
                });
            })
            .catch((error: IronWeb.SDKError) => {
                logAction(`Group add member error: ${error.message}. Error Code: ${error.code}`, "error");
                this.setState({addingMembers: false});
            });
    };

    removeMember = (memberID: string) => {
        if (!memberID) {
            return;
        }
        this.props.isAdmin ? this.removeListOfMembersFromGroup(memberID) : this.removeCurrentUserFromGroup();
    };

    removeListOfMembersFromGroup = (memberID: string) => {
        IronWeb.group
            .removeMembers(this.props.groupID, [memberID])
            .then((removeResult) => {
                if (removeResult.succeeded.length) {
                    this.setState({
                        groupMembers: this.state.groupMembers.filter((member) => member !== memberID),
                    });
                    logAction(`Removed users ${removeResult.succeeded} from the group ${this.props.groupID}`, "success");
                }
                if (removeResult.failed.length) {
                    logAction(`Failed to remove users ${removeResult.failed} from the group ${this.props.groupID}`, "success");
                }
            })
            .catch((error: IronWeb.SDKError) => {
                logAction(`Group remove member error: ${error.message}. Error Code: ${error.code}`, "error");
            });
    };

    removeCurrentUserFromGroup = () => {
        IronWeb.group
            .removeSelfAsMember(this.props.groupID)
            .then(() => {
                logAction(`Removed current user from the group ${this.props.groupID}`, "success");
                this.props.backToList();
            })
            .catch((error: IronWeb.SDKError) => {
                logAction(`Group remove self error: ${error.message}. Error Code: ${error.code}`, "error");
            });
    };

    getMembersList() {
        if (this.state.groupMembers.length > 0) {
            return this.state.groupMembers.map((member, index) => {
                let deleteMember;
                if (this.props.isAdmin || member === window.User.id) {
                    deleteMember = (
                        <IconButton
                            className="group-remove-member"
                            tooltip="Remove Member"
                            tooltipPosition="top-left"
                            onClick={this.removeMember.bind(this, member)}
                            style={{padding: "0"}}>
                            <LeaveGroup />
                        </IconButton>
                    );
                }
                return (
                    <ListItem
                        className="group-member-user"
                        disabled
                        key={index}
                        primaryText={member}
                        rightIcon={deleteMember}
                        leftIcon={member === window.User.id ? <Star color={cyan500} /> : <Person />}
                    />
                );
            });
        }
        return <ListItem disabled key="0" primaryText="There are no members in this group." />;
    }

    handleMemberAddEnter = (event: React.KeyboardEvent<HTMLInputElement>) => {
        if (event.charCode === 13) {
            this.addMember();
        }
    };

    render() {
        let addMemberMarkup;
        if (this.props.isAdmin) {
            addMemberMarkup = this.state.addingMembers ? (
                <LoadingPlaceholder />
            ) : (
                <TextField
                    id="newMemberInput"
                    autoFocus
                    type="text"
                    ref={this.setMemberRef}
                    hintText="Add New Member"
                    onKeyPress={this.handleMemberAddEnter}
                    style={{width: "100%", marginBottom: "10px"}}
                />
            );
        }
        return (
            <div className="groupMembers" style={{borderRight: "1px solid #e0e0e0", width: "50%", padding: "5px"}}>
                <div style={{fontSize: "18px", textAlign: "center", paddingBottom: "5px"}}>Members</div>
                <List style={listStyles}>{this.getMembersList()}</List>
                {addMemberMarkup}
            </div>
        );
    }
}
