import * as React from "react";
import {Tabs, Tab} from "@material-ui/core";
import DocumentList from "./documents/DocumentList";
import DocumentDetail from "./documents/DocumentDetail";
import NewDocument from "./documents/NewDocument";
import NewGroup from "./groups/NewGroup";
import GroupList from "./groups/GroupList";
import GroupDetail from "./groups/GroupDetail";
import {DocumentIDNameResponse, GroupMetaResponse} from "../../ironweb";
import {TabPanel} from "./TabPanel";

interface TabWrapperState {
    selectedList: null | DocumentIDNameResponse | "new";
    selectedGroup: null | GroupMetaResponse | "new";
    value: number;
}

export default class TabWrapper extends React.Component<Record<string, never>, TabWrapperState> {
    constructor(props: Record<string, never>) {
        super(props);
        this.state = {
            selectedList: null,
            selectedGroup: null,
            value: 0,
        };
    }

    handleChange = (_: React.ChangeEvent<Record<string, unknown>>, newValue: number) => {
        this.setState({value: newValue});
    };

    selectList = (list: DocumentIDNameResponse | "new") => {
        this.setState({
            selectedList: list,
        });
    };

    selectGroup = (group: GroupMetaResponse) => {
        this.setState({
            selectedGroup: group,
        });
    };

    clearSelectedList = () => {
        this.setState({selectedList: null});
    };

    clearSelectedGroup = () => {
        this.setState({selectedGroup: null});
    };

    getDocumentTabContent() {
        if (this.state.selectedList === "new") {
            return <NewDocument backToList={this.clearSelectedList} onListSelect={this.selectList} />;
        }
        if (this.state.selectedList !== null) {
            return <DocumentDetail document={this.state.selectedList} backToList={this.clearSelectedList} />;
        }
        return <DocumentList onListSelect={this.selectList} />;
    }

    getGroupTabContent() {
        if (this.state.selectedGroup === "new") {
            return <NewGroup backToGroup={this.clearSelectedGroup} onGroupSelect={this.selectGroup} />;
        }
        if (this.state.selectedGroup !== null) {
            return <GroupDetail group={this.state.selectedGroup} backToList={this.clearSelectedGroup} />;
        }
        return <GroupList onGroupSelect={this.selectGroup} />;
    }

    render() {
        return (
            <>
                <Tabs value={this.state.value} onChange={this.handleChange} style={{width: "1000px"}}>
                    <Tab label="Todo Lists" className="document-tab" />
                    <Tab label="Groups" className="group-tab" />
                </Tabs>
                <TabPanel value={this.state.value} index={0} style={{minHeight: "500px"}}>
                    {this.getDocumentTabContent()}
                </TabPanel>
                <TabPanel value={this.state.value} index={1} style={{minHeight: "500px"}}>
                    {this.getGroupTabContent()}
                </TabPanel>
            </>
        );
    }
}
