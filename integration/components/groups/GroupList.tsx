import * as React from "react";
import * as IronWeb from "../../../src/shim";
import {logAction} from "../../Logger";
import {List, ListItem, Chip, Divider, Fab, ListItemText, ListItemIcon} from "@material-ui/core";
import {People, Person, Gavel, Refresh, Add} from "@material-ui/icons";
import {lightGreen, orange, cyan} from "@material-ui/core/colors";
const lightGreen200 = lightGreen["200"];
const lightGreen400 = lightGreen["400"];
const orange200 = orange["200"];
const orange400 = orange["400"];
const lightGreenA700 = lightGreen.A700;
const cyan500 = cyan["500"];
import {GroupMetaResponse} from "../../../ironweb";

interface GroupListProps {
    onGroupSelect(group: GroupMetaResponse | "new"): void;
}

interface GroupListState {
    groups: GroupMetaResponse[];
}

export default class GroupList extends React.Component<GroupListProps, GroupListState> {
    constructor(props: GroupListProps) {
        super(props);
        this.state = {
            groups: [],
        };
    }

    componentDidMount() {
        this.loadGroups();
    }

    loadGroups = () => {
        logAction(`Retrieving list of groups user is a part of`);
        IronWeb.group
            .list()
            .then((groupList) => {
                logAction(`Retrieved users list of groups. Found ${groupList.result.length} groups.`, "success");
                this.setState({
                    groups: groupList.result,
                });
            })
            .catch((error: IronWeb.SDKError) => {
                logAction(`Group list error: ${error.message}. Error Code: ${error.code}`, "error");
            });
    };

    getGroupDetails(group: GroupMetaResponse) {
        const chipDetails: JSX.Element[] = [];
        if (group.isAdmin) {
            chipDetails.push(
                <Chip
                    icon={<Gavel htmlColor={orange400} />}
                    label="Admin"
                    color="primary"
                    classes={{
                        colorPrimary: orange200,
                    }}
                    className="group-admin-chip"
                    key="admin"
                />
            );
        }
        if (group.isMember) {
            chipDetails.push(
                <Chip
                    icon={<Person htmlColor={lightGreen400} />}
                    label="Member"
                    color="primary"
                    classes={{
                        colorPrimary: lightGreen200,
                    }}
                    className="group-member-chip"
                    key="member"
                />
            );
        }

        return <div style={{display: "flex", float: "right"}}>{chipDetails}</div>;
    }

    getGroups() {
        if (this.state.groups.length === 0) {
            return (
                <ListItem disabled>
                    <ListItemText primary="No Groups!" />
                </ListItem>
            );
        }
        return this.state.groups.map((group) => {
            const rowName = (
                <span>
                    {group.groupName || "{No Name}"}
                    <span style={{fontSize: 12, paddingLeft: 10}}>{`(${group.groupID})`}</span>
                </span>
            );
            const created = new Date(group.created).toLocaleDateString();
            const updated = new Date(group.updated).toLocaleDateString();
            const groupDates = <div style={{fontSize: 12}}>{`Created: ${created} Updated: ${updated}`}</div>;
            return [
                <ListItem key={group.groupID} className="group-list-item" onClick={this.props.onGroupSelect.bind(null, group)}>
                    <ListItemIcon>
                        <People />
                    </ListItemIcon>
                    <ListItemText primary={rowName} secondary={groupDates} />
                    {this.getGroupDetails(group)}
                </ListItem>,
                <Divider key="div" />,
            ];
        });
    }

    render() {
        return (
            <div className="group-list">
                <div style={{display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", margin: "10px 0"}}>
                    <h1>Groups</h1>
                    <Fab
                        className="refresh-group-list"
                        onClick={this.loadGroups}
                        size="small"
                        color="primary"
                        classes={{
                            primary: lightGreenA700,
                        }}>
                        <Refresh />
                    </Fab>
                </div>
                <List style={{backgroundColor: "#f5f5f5", padding: 0, maxHeight: "350px", overflowY: "auto"}}>{this.getGroups()}</List>
                <div style={{display: "flex", justifyContent: "flex-end", margin: "10px 0"}}>
                    <Fab
                        className="add-new-group"
                        onClick={this.props.onGroupSelect.bind(null, "new")}
                        size="small"
                        color="primary"
                        classes={{
                            primary: cyan500,
                        }}>
                        <Add />
                    </Fab>
                </div>
            </div>
        );
    }
}
