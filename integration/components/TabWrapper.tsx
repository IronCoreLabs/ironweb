import * as React from "react";
import {Tabs, Tab} from "material-ui/Tabs";
import DocumentList from "./documents/DocumentList";
import DocumentDetail from "./documents/DocumentDetail";
import NewDocument from "./documents/NewDocument";
import NewGroup from "./groups/NewGroup";
import GroupList from "./groups/GroupList";
import GroupDetail from "./groups/GroupDetail";
import {DocumentIDNameResponse, GroupMetaResponse} from "../../ironweb";

interface TabWrapperState {
    selectedList: null | DocumentIDNameResponse | "new";
    selectedGroup: null | GroupMetaResponse | "new";
}

export default class TabWrapper extends React.Component<Record<string, never>, TabWrapperState> {
    constructor(props: Record<string, never>) {
        super(props);
        this.state = {
            selectedList: null,
            selectedGroup: null,
        };
    }

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
            <Tabs style={{width: "1000px", minHeight: "500px"}} tabTemplateStyle={{margin: "10px 20px", width: "inherit"}}>
                <Tab label="Todo Lists" className="document-tab">
                    {this.getDocumentTabContent()}
                </Tab>
                <Tab label="Groups" className="group-tab">
                    {this.getGroupTabContent()}
                </Tab>
            </Tabs>
        );
    }
}
