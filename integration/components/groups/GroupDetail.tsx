import * as React from "react";
import Divider from "material-ui/Divider";
import TextField from "material-ui/TextField";
import FloatingActionButton from "material-ui/FloatingActionButton";
import Button from "@material-ui/core/Button";
import Dialog from "material-ui/Dialog";
import ArrowBack from "@material-ui/icons/ArrowBack";
import Refresh from "@material-ui/icons/Refresh";
import Delete from "@material-ui/icons/Delete";
import ImageRotateRight from "@material-ui/icons/RotateRight";
import lightGreen from "@material-ui/core/colors/lightGreen";
import red from "@material-ui/core/colors/red";
import grey from "@material-ui/core/colors/grey";
const lightGreenA700 = lightGreen.A700;
const red700 = red["700"];
const grey400 = grey["400"];
import {GroupMetaResponse, GroupDetailResponse} from "../../../ironweb";
import * as IronWeb from "../../../src/shim";
import {logAction} from "../../Logger";
import GroupMembers from "./GroupMembers";
import GroupAdmins from "./GroupAdmins";
import LoadingPlaceholder from "../LoadingPlaceholder";

interface GroupDetailProps {
    group: GroupMetaResponse;
    backToList: () => void;
}

interface GroupDetailState {
    groupMeta: GroupMetaResponse;
    groupAdmins: string[];
    groupMembers: string[];
    needsRotation: boolean;
    nameChanging: boolean;
    name: string | null;
    groupIDConfirmError: boolean;
    showingDeleteConfirmation: boolean;
}

export default class GroupDetail extends React.Component<GroupDetailProps, GroupDetailState> {
    groupConfirmInput!: TextField;
    constructor(props: GroupDetailProps) {
        super(props);
        this.state = {
            groupMeta: props.group,
            groupAdmins: [],
            groupMembers: [],
            needsRotation: false,
            nameChanging: false,
            name: props.group.groupName,
            groupIDConfirmError: false,
            showingDeleteConfirmation: false,
        };
        this.loadGroup();
    }

    loadGroup = () => {
        logAction(`Retrieving group ${this.state.groupMeta.groupName}...`);
        IronWeb.group
            .get(this.props.group.groupID)
            .then((group) => {
                const groupAdmins = (group as GroupDetailResponse).groupAdmins || [];
                const groupMembers = (group as GroupDetailResponse).groupMembers || [];
                const needsRotation = (group as GroupDetailResponse).needsRotation || false;
                this.setState({groupAdmins, groupMembers, needsRotation, groupMeta: group});
            })
            .catch((error: IronWeb.SDKError) => {
                logAction(`Group get error: ${error.message}. Error Code: ${error.code}`, "error");
            });
    };

    updateGroupName = () => {
        if (this.state.name !== this.state.groupMeta.groupName) {
            this.setState({nameChanging: true});
            IronWeb.group
                .update(this.props.group.groupID, {groupName: this.state.name || null})
                .then((group) => {
                    logAction(`Successfully updated group name to ${group.groupName}`);
                    this.setState({
                        name: group.groupName || "",
                        nameChanging: false,
                        groupMeta: group,
                    });
                })
                .catch((error: IronWeb.SDKError) => {
                    logAction(`Group name update error: ${error.message}. Error Code: ${error.code}`, "error");
                    this.setState({
                        nameChanging: false,
                    });
                });
        }
    };

    /**
     * Verify the group ID the user typed is correct before making the actual delete call.
     */
    deleteGroup = () => {
        const groupConfirmID = this.groupConfirmInput.getValue();
        if (groupConfirmID !== this.props.group.groupID) {
            return this.setState({groupIDConfirmError: true});
        }
        IronWeb.group
            .deleteGroup(this.props.group.groupID)
            .then(() => {
                logAction(`Group deleted successfully.`);
                this.props.backToList();
            })
            .catch((error: IronWeb.SDKError) => logAction(`Group delete error: ${error.message}. Error Code: ${error.code}`, "error"));
    };

    /**
     * Make the user confirm the group ID before allowing delete.
     */
    getDeleteConfirmationContent = () => {
        const groupIDConfirm = (groupIDConfirmInput: TextField) => {
            this.groupConfirmInput = groupIDConfirmInput;
        };
        return (
            <div>
                <TextField
                    style={{width: "100%"}}
                    ref={groupIDConfirm}
                    hintText="Confirm group ID in order to delete"
                    autoFocus
                    errorText={this.state.groupIDConfirmError ? "Incorrect ID" : ""}
                />
            </div>
        );
    };

    /**
     * Only return the group delete button if the user is an admin of the group.
     */
    getDeleteGroupIcon() {
        if (this.state.groupMeta.isAdmin) {
            return (
                <FloatingActionButton onClick={() => this.setState({showingDeleteConfirmation: true})} mini backgroundColor={red700}>
                    <Delete />
                </FloatingActionButton>
            );
        }
        return null;
    }

    /**
     * Verify the group ID the user typed is correct before making the actual delete call.
     */
    roatateGroupPrivateKey = () => {
        IronWeb.group
            .rotatePrivateKey(this.props.group.groupID)
            .then((groupKeyUpdate) => {
                logAction(`Group private key rotation was successful`);
                this.setState({needsRotation: groupKeyUpdate.needsRotation});
            })
            .catch((error: IronWeb.SDKError) => {
                logAction(`Group rotation error: ${error.message}. Error Code: ${error.code}`, "error");
            });
    };

    getRotateGroupPrivateKeyIcon() {
        if (this.state.groupMeta.isAdmin) {
            return (
                <FloatingActionButton onClick={this.roatateGroupPrivateKey} mini backgroundColor={this.state.needsRotation ? red700 : grey400}>
                    <ImageRotateRight />
                </FloatingActionButton>
            );
        }
        return null;
    }

    render() {
        const {groupMeta} = this.state;
        const modalAction = [
            <Button key="groupDelete" className="submit-passcode-change" color="secondary" onClick={this.deleteGroup}>
                Delete Group
            </Button>,
        ];
        return (
            <div className="group-detail">
                <div style={{display: "flex", justifyContent: "space-around"}}>
                    <FloatingActionButton className="back-to-group-list" onClick={this.props.backToList} mini>
                        <ArrowBack />
                    </FloatingActionButton>
                    <FloatingActionButton onClick={this.loadGroup} mini backgroundColor={lightGreenA700}>
                        <Refresh />
                    </FloatingActionButton>
                    {this.getRotateGroupPrivateKeyIcon()}
                    {this.getDeleteGroupIcon()}
                </div>
                <Dialog
                    modal={false}
                    open={this.state.showingDeleteConfirmation}
                    title="Confirm Group Delete"
                    onRequestClose={() => this.setState({showingDeleteConfirmation: false, groupIDConfirmError: false})}
                    actions={modalAction}
                    bodyClassName="password-change-dialog-body">
                    {this.getDeleteConfirmationContent()}
                </Dialog>
                <div style={{textAlign: "center", marginBottom: 7}}>
                    <div className="group-name" style={{fontSize: 24, paddingBottom: 5}}>
                        {this.state.nameChanging ? (
                            <LoadingPlaceholder />
                        ) : (
                            <TextField
                                id="groupName"
                                value={this.state.name || ""}
                                inputStyle={{textAlign: "center", fontSize: "27px"}}
                                onBlur={this.updateGroupName}
                                onChange={(_, newValue: string) => this.setState({name: newValue})}
                            />
                        )}
                    </div>
                    <div className="group-id" style={{fontSize: 11}}>{`ID: ${groupMeta.groupID}`}</div>
                    <div style={{fontSize: 11}}>{`Created: ${new Date(groupMeta.created).toLocaleDateString()}`}</div>
                    <div style={{fontSize: 11}}>{`Updated: ${new Date(groupMeta.updated).toLocaleDateString()}`}</div>
                </div>
                <Divider />
                <div style={{minHeight: 300, display: "flex", padding: "10px 0 0"}}>
                    <GroupMembers
                        groupID={groupMeta.groupID}
                        isAdmin={groupMeta.isAdmin}
                        groupMembers={this.state.groupMembers}
                        backToList={this.props.backToList}
                    />
                    <GroupAdmins groupID={groupMeta.groupID} isAdmin={groupMeta.isAdmin} groupAdmins={this.state.groupAdmins} />
                </div>
            </div>
        );
    }
}
