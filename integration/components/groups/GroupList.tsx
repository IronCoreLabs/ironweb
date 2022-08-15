import * as React from "react";
import * as IronWeb from "../../../src/shim";
import {logAction} from "../../Logger";
import {List, ListItem} from "material-ui/List";
import Chip from "material-ui/Chip";
import Divider from "material-ui/Divider";
import FloatingActionButton from "material-ui/FloatingActionButton";
import Avatar from "material-ui/Avatar";
import People from '@material-ui/icons/People';
import Person from '@material-ui/icons/Person';
import Gavel from '@material-ui/icons/Gavel';
import Refresh from '@material-ui/icons/Refresh';
import Add from '@material-ui/icons/Add';
import lightGreen from '@material-ui/core/colors/lightGreen';
import orange from '@material-ui/core/colors/orange';
import cyan from '@material-ui/core/colors/cyan';
const lightGreen200 = lightGreen['200'];
const lightGreen400 = lightGreen['400'];
const orange200 = orange['200'];
const orange400 = orange['400'];
const lightGreenA700 = lightGreen.A700;
const cyan500 = cyan['500'];
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
        const chipStyle = {padding: "0 5px", fontSize: "12px"};
        const chipDetails: JSX.Element[] = [];
        if (group.isAdmin) {
            chipDetails.push(
                <Chip className="group-admin-chip" labelStyle={chipStyle} key="admin" backgroundColor={orange200}>
                    <Avatar icon={<Gavel />} backgroundColor={orange400} />
                    Admin
                </Chip>
            );
        }
        if (group.isMember) {
            chipDetails.push(
                <Chip className="group-member-chip" labelStyle={chipStyle} key="member" backgroundColor={lightGreen200}>
                    <Avatar icon={<Person />} backgroundColor={lightGreen400} />
                    Member
                </Chip>
            );
        }

        return <div style={{display: "flex", float: "right"}}>{chipDetails}</div>;
    }

    getGroups() {
        if (this.state.groups.length === 0) {
            return <ListItem disabled primaryText="No Groups!" />;
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
                <ListItem
                    key={group.groupID}
                    primaryText={rowName}
                    secondaryText={groupDates}
                    className="group-list-item"
                    leftIcon={<People />}
                    onClick={this.props.onGroupSelect.bind(null, group)}>
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
                    <FloatingActionButton className="refresh-group-list" onClick={this.loadGroups} mini backgroundColor={lightGreenA700}>
                        <Refresh />
                    </FloatingActionButton>
                </div>
                <List style={{backgroundColor: "#f5f5f5", padding: 0, maxHeight: "350px", overflowY: "auto"}}>{this.getGroups()}</List>
                <div style={{display: "flex", justifyContent: "flex-end", margin: "10px 0"}}>
                    <FloatingActionButton className="add-new-group" onClick={this.props.onGroupSelect.bind(null, "new")} mini backgroundColor={cyan500}>
                        <Add />
                    </FloatingActionButton>
                </div>
            </div>
        );
    }
}
