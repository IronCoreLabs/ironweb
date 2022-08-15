import * as React from "react";
import * as IronWeb from "../../../src/shim";
import {logAction} from "../../Logger";
import GrantDocumentAccess from "./GrantDocumentAccess";
import cyan from "@material-ui/core/colors/cyan";
const cyan500 = cyan["500"];
import {DocumentVisibilityList, DocumentAssociation} from "../../../ironweb";
import {Tooltip, ListItem, List, ListItemText, ListItemIcon, IconButton, Collapse} from "@material-ui/core";
import {ExpandLess, ExpandMore, Person, Star, People, Cancel as Revoke} from "@material-ui/icons";

interface DocumentVisibilityProps {
    documentID: string;
    visibleTo: DocumentVisibilityList;
    association: DocumentAssociation;
    loadDocumentMetadata(): void;
}

interface DocumentVisibilityState {
    expandedUsers: boolean;
    expandedGroups: boolean;
}

export default class DocumentVisibility extends React.Component<DocumentVisibilityProps, DocumentVisibilityState> {
    constructor(props: DocumentVisibilityProps) {
        super(props);
        this.state = {
            expandedUsers: true,
            expandedGroups: true,
        };
    }

    revokeDocumentAccess(id: string, type: string) {
        const unshareList = {
            [type === "user" ? "users" : "groups"]: [{id}],
        };
        IronWeb.document
            .revokeAccess(this.props.documentID, unshareList)
            .then((revokeResponse) => {
                if (revokeResponse.failed.length) {
                    const list = revokeResponse.failed.map((share) => `${share.type}:${share.id}:${share.error}`);
                    logAction(`Document failed to be revoked from [${list}]`, "error");
                }
                if (revokeResponse.succeeded.length) {
                    const list = revokeResponse.succeeded.map((share) => `${share.type}:${share.id}`);
                    logAction(`Document successfully revoked from [${list}]`, "success");
                    this.props.loadDocumentMetadata();
                }
            })
            .catch((error: IronWeb.SDKError) => {
                logAction(`Document revoke error: ${error.message}. Error Code: ${error.code}`, "error");
            });
    }

    getUserAccessRow = ({id}: {id: string}) => {
        const currentUserIcon = id === window.User.id ? <Star htmlColor={cyan500} /> : undefined;
        let revokeIcon;
        if (!currentUserIcon) {
            //No user can remove themselves from a share, regardless of whether they're the author or not so only create a revoke icon if this is not the current user
            revokeIcon = (
                <Tooltip title="Revoke Access" placement="top-start">
                    <IconButton className="revoke-access" style={{padding: "0"}} onClick={this.revokeDocumentAccess.bind(this, id, "user")}>
                        <Revoke />
                    </IconButton>
                </Tooltip>
            );
        }

        return (
            <ListItem key={id} className="user-visible-item" disabled>
                <ListItemIcon>{currentUserIcon}</ListItemIcon>
                <ListItemText primary={id} />
                <ListItemIcon>{revokeIcon}</ListItemIcon>
            </ListItem>
        );
    };

    getUserSharingList() {
        if (!this.props.visibleTo || !this.props.visibleTo.users.length) {
            return (
                <ListItem>
                    <ListItemIcon>
                        <Person />
                    </ListItemIcon>
                    <ListItemText primary="No User Visibility" />
                </ListItem>
            );
        }
        return (
            <>
                <ListItem className="user-visible-to" onClick={() => this.setState({expandedUsers: !this.state.expandedUsers})}>
                    <ListItemIcon>
                        <Person />
                    </ListItemIcon>
                    <ListItemText primary={`Users (${this.props.visibleTo.users.length})`} />
                    {this.state.expandedUsers ? <ExpandLess /> : <ExpandMore />}
                </ListItem>
                <Collapse in={this.state.expandedUsers} timeout="auto" unmountOnExit>
                    <List component="div" disablePadding>
                        {this.props.visibleTo.users.map(this.getUserAccessRow)}
                    </List>
                </Collapse>
            </>
        );
    }

    getGroupAccessRow = ({id, name}: {id: string; name?: string}) => {
        const revokeIcon = (
            <Tooltip title="Revoke Access" placement="top-start">
                <IconButton className="revoke-access" style={{padding: "0"}} onClick={this.revokeDocumentAccess.bind(this, id, "group")}>
                    <Revoke />
                </IconButton>
            </Tooltip>
        );
        return (
            <ListItem className="group-visible-item" key={id} disabled>
                <ListItemText primary={`${name} (${id})`} />
                <ListItemIcon>{revokeIcon}</ListItemIcon>
            </ListItem>
        );
    };

    getGroupSharingList() {
        if (!this.props.visibleTo || !this.props.visibleTo.groups.length) {
            return (
                <ListItem>
                    <ListItemIcon>
                        <People />
                    </ListItemIcon>
                    <ListItemText primary="No Group Visibility" />
                </ListItem>
            );
        }
        return (
            <>
                <ListItem className="group-visible-to" onClick={() => this.setState({expandedGroups: !this.state.expandedGroups})}>
                    <ListItemIcon>
                        <People />
                    </ListItemIcon>
                    <ListItemText primary={`Groups (${this.props.visibleTo.groups.length})`} />
                    {this.state.expandedGroups ? <ExpandLess /> : <ExpandMore />}
                </ListItem>
                <Collapse in={this.state.expandedGroups} timeout="auto" unmountOnExit>
                    <List component="div" disablePadding>
                        {this.props.visibleTo.users.map(this.getGroupAccessRow)}
                    </List>
                </Collapse>
            </>
        );
    }

    render() {
        const listStyle: React.CSSProperties = {
            maxHeight: "250px",
            minHeight: "10px",
            overflow: "auto",
            backgroundColor: "#f5f5f5",
            padding: "0",
            marginBottom: "10px",
        };

        return (
            <div style={{width: "50%", padding: "5px"}}>
                <div style={{fontSize: "18px", textAlign: "center", paddingBottom: "5px"}}>Visibility</div>
                <List style={listStyle}>
                    {this.getUserSharingList()}
                    {this.getGroupSharingList()}
                </List>
                <GrantDocumentAccess
                    listID={this.props.documentID}
                    groupAccess={this.props.visibleTo.groups.map(({id}) => id)}
                    refreshMetadata={this.props.loadDocumentMetadata}
                />
            </div>
        );
    }
}
