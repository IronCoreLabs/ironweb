import * as React from "react";
import * as IronWeb from "../../../src/shim";
import {logAction} from "../../Logger";
import LoadingPlaceholder from "../LoadingPlaceholder";
import {List, ListItem} from "material-ui/List";
import TextField from "material-ui/TextField";
import IconButton from "material-ui/IconButton";
import Star from "material-ui/svg-icons/toggle/star";
import Gavel from "material-ui/svg-icons/action/gavel";
import RemoveAdmin from "material-ui/svg-icons/action/open-in-new";
import {cyan500} from "material-ui/styles/colors";

interface GroupAdminsProps {
    groupID: string;
    isAdmin: boolean;
    groupAdmins: string[];
}

interface GroupAdminsState {
    addingAdmins: boolean;
    groupAdmins: string[];
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

export default class GroupAdmins extends React.Component<GroupAdminsProps, GroupAdminsState> {
    newAdminInput!: TextField;

    constructor(props: GroupAdminsProps) {
        super(props);
        this.state = {
            addingAdmins: false,
            groupAdmins: props.groupAdmins,
        };
    }

    UNSAFE_componentWillReceiveProps(nextProps: GroupAdminsProps) {
        this.setState({groupAdmins: nextProps.groupAdmins});
    }

    setAdminRef = (newAdminInput: TextField) => {
        this.newAdminInput = newAdminInput;
    };

    addAdmin = () => {
        const memberValue = this.newAdminInput.getValue();
        if (!memberValue) {
            return;
        }
        this.setState({addingAdmins: true});
        IronWeb.group
            .addAdmins(this.props.groupID, [memberValue])
            .then((addResult) => {
                if (addResult.succeeded.length) {
                    this.setState({
                        groupAdmins: [...this.state.groupAdmins, ...addResult.succeeded],
                    });
                    logAction(`Added users ${addResult.succeeded} as admin(s) of the group ${this.props.groupID}`, "success");
                }
                if (addResult.failed.length) {
                    logAction(`Failed to add users '${addResult.failed.map(({id}) => id)}' as admin(s) to the group ${this.props.groupID}`, "error");
                }
                this.setState({addingAdmins: false}, () => {
                    this.newAdminInput.getInputNode().value = "";
                });
            })
            .catch((error: IronWeb.SDKError) => {
                logAction(`Group add admin error: ${error.message}. Error Code: ${error.code}`, "error");
                this.setState({addingAdmins: false});
            });
    };

    removeAdmin = (adminUser: string) => {
        IronWeb.group
            .removeAdmins(this.props.groupID, [adminUser])
            .then((removeResult) => {
                if (removeResult.succeeded.length) {
                    this.setState({
                        groupAdmins: this.state.groupAdmins.filter((admin) => removeResult.succeeded.indexOf(admin) === -1),
                    });
                    logAction(`Removed users ${removeResult.succeeded} as admins from the group ${this.props.groupID}`, "success");
                }
                if (removeResult.failed.length) {
                    logAction(`Failed to remove users [${removeResult.failed.map(({id}) => id)}] as admins from the group ${this.props.groupID}`, "error");
                }
            })
            .catch((error: IronWeb.SDKError) => {
                logAction(`Group remove admin error: ${error.message}. Error Code: ${error.code}`, "error");
            });
    };

    handleAdminAddEnter = (event: React.KeyboardEvent<HTMLInputElement>) => {
        if (event.charCode === 13) {
            this.addAdmin();
        }
    };

    getAdminList() {
        return this.state.groupAdmins.map((admin, index) => {
            const removeAdminMarkup = (
                <IconButton
                    className="group-remove-admin"
                    tooltip="Remove Admin"
                    tooltipPosition="top-left"
                    onClick={this.removeAdmin.bind(this, admin)}
                    style={{padding: "0"}}>
                    <RemoveAdmin />
                </IconButton>
            );
            return (
                <ListItem
                    className="group-admin-user"
                    disabled
                    key={index}
                    primaryText={admin}
                    leftIcon={admin === window.User.id ? <Star color={cyan500} /> : <Gavel />}
                    rightIcon={removeAdminMarkup}
                />
            );
        });
    }

    render() {
        let addAdminMarkup;
        if (this.props.isAdmin) {
            addAdminMarkup = this.state.addingAdmins ? (
                <LoadingPlaceholder />
            ) : (
                <TextField
                    id="newAdminInput"
                    ref={this.setAdminRef}
                    onKeyPress={this.handleAdminAddEnter}
                    type="text"
                    hintText="Add New Admin"
                    style={{width: "100%", marginBottom: "10px"}}
                />
            );
        }
        return (
            <div className="groupAdmins" style={{width: "50%", padding: "5px"}}>
                <div style={{fontSize: "18px", textAlign: "center", paddingBottom: "5px"}}>Admins</div>
                <List style={listStyles}>{this.getAdminList()}</List>
                {addAdminMarkup}
            </div>
        );
    }
}
