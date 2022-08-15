import * as React from "react";
import * as IronWeb from "../../../src/shim";
import {logAction} from "../../Logger";
import LoadingPlaceholder from "../LoadingPlaceholder";
import {List, ListItem, TextField, TextFieldProps, IconButton, ListItemIcon, ListItemText} from "@material-ui/core";
import {Star, Gavel, OpenInNew as RemoveAdmin} from "@material-ui/icons";
import cyan from "@material-ui/core/colors/cyan";
import {Tooltip} from "@material-ui/core";
const cyan500 = cyan["500"];

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
    newAdminInput!: React.RefObject<TextFieldProps>;

    constructor(props: GroupAdminsProps) {
        super(props);
        this.state = {
            addingAdmins: false,
            groupAdmins: props.groupAdmins,
        };
        this.newAdminInput = React.createRef();
    }

    UNSAFE_componentWillReceiveProps(nextProps: GroupAdminsProps) {
        this.setState({groupAdmins: nextProps.groupAdmins});
    }

    setAdminRef = (newAdminInput: React.RefObject<TextFieldProps>) => {
        this.newAdminInput = newAdminInput;
    };

    addAdmin = () => {
        const memberValue = this.newAdminInput.current?.value as string;
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
                    this.newAdminInput.current!.value = "";
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
                <Tooltip title="Remove Admin" placement="top-start">
                    <IconButton className="group-remove-admin" onClick={this.removeAdmin.bind(this, admin)} style={{padding: "0"}}>
                        <RemoveAdmin />
                    </IconButton>
                </Tooltip>
            );
            return (
                <ListItem className="group-admin-user" disabled key={index}>
                    <ListItemIcon>{admin === window.User.id ? <Star htmlColor={cyan500} /> : <Gavel />}</ListItemIcon>
                    <ListItemText primary={admin} />
                    <ListItemIcon>{removeAdminMarkup}</ListItemIcon>
                </ListItem>
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
                    inputRef={this.setAdminRef}
                    onKeyPress={this.handleAdminAddEnter}
                    type="text"
                    helperText="Add New Admin"
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
