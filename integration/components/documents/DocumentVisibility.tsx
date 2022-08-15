import * as React from "react";
import * as IronWeb from "../../../src/shim";
import {logAction} from "../../Logger";
import {List, ListItem} from "material-ui/List";
import GrantDocumentAccess from "./GrantDocumentAccess";
import IconButton from "material-ui/IconButton";
import Person from "@material-ui/icons/Person";
import Star from "@material-ui/icons/Star";
import People from "@material-ui/icons/People";
import Revoke from "@material-ui/icons/Cancel";
import cyan from "@material-ui/core/colors/cyan";
const cyan500 = cyan["500"];
import {DocumentVisibilityList, DocumentAssociation} from "../../../ironweb";

interface DocumentVisibilityProps {
    documentID: string;
    visibleTo: DocumentVisibilityList;
    association: DocumentAssociation;
    loadDocumentMetadata(): void;
}

export default class DocumentVisibility extends React.Component<DocumentVisibilityProps> {
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
                <IconButton
                    className="revoke-access"
                    tooltip="Revoke Access"
                    tooltipPosition="top-left"
                    style={{padding: "0"}}
                    onClick={this.revokeDocumentAccess.bind(this, id, "user")}>
                    <Revoke />
                </IconButton>
            );
        }

        return <ListItem key={id} className="user-visible-item" primaryText={id} disabled leftIcon={currentUserIcon} rightIcon={revokeIcon} />;
    };

    getUserSharingList() {
        if (!this.props.visibleTo || !this.props.visibleTo.users.length) {
            return <ListItem primaryText="No User Visibility" leftIcon={<Person />} />;
        }
        return (
            <ListItem
                className="user-visible-to"
                primaryText={`Users (${this.props.visibleTo.users.length})`}
                leftIcon={<Person />}
                primaryTogglesNestedList
                initiallyOpen
                nestedItems={this.props.visibleTo.users.map(this.getUserAccessRow)}
            />
        );
    }

    getGroupAccessRow = ({id, name}: {id: string; name?: string}) => {
        const revokeIcon = (
            <IconButton
                className="revoke-access"
                tooltip="Revoke Access"
                tooltipPosition="top-left"
                style={{padding: "0"}}
                onClick={this.revokeDocumentAccess.bind(this, id, "group")}>
                <Revoke />
            </IconButton>
        );
        return <ListItem className="group-visible-item" key={id} primaryText={`${name} (${id})`} disabled rightIcon={revokeIcon} />;
    };

    getGroupSharingList() {
        if (!this.props.visibleTo || !this.props.visibleTo.groups.length) {
            return <ListItem primaryText="No Group Visibility" leftIcon={<People />} />;
        }
        return (
            <ListItem
                className="group-visible-to"
                primaryText={`Groups (${this.props.visibleTo.groups.length})`}
                leftIcon={<People />}
                primaryTogglesNestedList
                initiallyOpen
                nestedItems={this.props.visibleTo.groups.map(this.getGroupAccessRow)}
            />
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
