import * as React from "react";
import * as IronWeb from "../../../src/shim";
import {DocumentAssociationResponse, DocumentIDNameResponse, DocumentAssociation} from "../../../ironweb";
import {logAction} from "../../Logger";
import {isLocalDocument} from "../../DocumentDB";
import {List, ListItem} from "material-ui/List";
import FloatingActionButton from "material-ui/FloatingActionButton";
import Subheader from "material-ui/Subheader";
import Refresh from "material-ui/svg-icons/navigation/refresh";
import Divider from "material-ui/Divider";
import Chip from "material-ui/Chip";
import Cloud from "material-ui/svg-icons/file/cloud";
import Local from "material-ui/svg-icons/file/cloud-off";
import Add from "material-ui/svg-icons/content/add";
import Group from "material-ui/svg-icons/social/group-add";
import Person from "material-ui/svg-icons/social/person-add";
import Assignment from "material-ui/svg-icons/action/assignment";
import Avatar from "material-ui/Avatar";
import {lightGreen200, lightGreen400, orange200, orange400, lightGreenA700, cyan500, brown200, brown400} from "material-ui/styles/colors";
import AddDocumentData from "./AddDocumentData";

interface DocumentListProps {
    onListSelect: (list: DocumentIDNameResponse | "new") => void;
}

interface DocumentListState {
    storeLocal: boolean;
    lists: DocumentAssociationResponse[];
    documentDataAdd: DocumentAssociationResponse | null;
}

export default class DocumentList extends React.Component<DocumentListProps, DocumentListState> {
    constructor(props: DocumentListProps) {
        super(props);
        this.state = {
            storeLocal: false,
            lists: [],
            documentDataAdd: null,
        };
    }

    componentDidMount() {
        this.loadDocuments();
    }

    loadDocuments = () => {
        logAction(`Retrieving users list of documents`);
        IronWeb.document
            .list()
            .then((documentList) => {
                logAction(`Retrieving users list of documents. Found ${documentList.result.length} documents.`, "success");
                this.setState({
                    lists: documentList.result,
                });
            })
            .catch((error: IronWeb.SDKError) => {
                logAction(`Document list error: ${error.message}. Error Code: ${error.code}`, "error");
            });
    };

    getAssociationChip(association: DocumentAssociation) {
        if (association === "owner") {
            return null;
        }
        let icon, text;
        if (association === "fromUser") {
            icon = <Person />;
            text = "User";
        } else {
            icon = <Group />;
            text = "Group";
        }

        return (
            <Chip labelStyle={{padding: "0 5px", fontSize: "12px", width: "45px", textAlign: "center"}} backgroundColor={brown200}>
                <Avatar icon={icon} backgroundColor={brown400} />
                {text}
            </Chip>
        );
    }

    openManualDataInput = (event: React.MouseEvent<Chip>, document: DocumentAssociationResponse, isLocal: boolean) => {
        event.stopPropagation();
        if (isLocal) {
            return;
        }
        this.setState({documentDataAdd: document});
    };

    getListChipContent(document: DocumentAssociationResponse) {
        let icon, text, color, avatarColor;
        const isLocal = isLocalDocument(document.documentID);
        if (isLocal) {
            icon = <Local />;
            text = "Local";
            color = orange200;
            avatarColor = orange400;
        } else {
            icon = <Cloud />;
            text = "Hosted";
            color = lightGreen200;
            avatarColor = lightGreen400;
        }

        return (
            <div style={{display: "flex", float: "right"}}>
                <Chip
                    className={`storage-type-${text.toLowerCase()}`}
                    labelStyle={{padding: "0 5px", fontSize: 12, width: 45, textAlign: "center"}}
                    backgroundColor={color}
                    onClick={(e) => this.openManualDataInput(e, document, isLocal)}>
                    <Avatar icon={icon} backgroundColor={avatarColor} />
                    {text}
                </Chip>
                {this.getAssociationChip(document.association)}
            </div>
        );
    }

    getDocumentsMarkup(documents: DocumentAssociationResponse[]) {
        if (documents.length === 0) {
            return <ListItem disabled primaryText="No Documents!" />;
        }
        return documents.map((doc) => {
            const rowName = (
                <div style={{paddingBottom: 5}}>
                    {doc.documentName || "{No Name}"}
                    <span style={{fontSize: 12, paddingLeft: 10}}>{`(${doc.documentID})`}</span>
                </div>
            );
            const created = new Date(doc.created).toLocaleDateString();
            const updated = new Date(doc.updated).toLocaleDateString();
            const docDates = <div style={{fontSize: 12}}>{`Created: ${created} Updated: ${updated}`}</div>;

            return [
                <ListItem
                    className="document-list-item"
                    key={doc.documentID}
                    primaryText={rowName}
                    secondaryText={docDates}
                    leftIcon={<Assignment style={{paddingTop: "7px"}} />}
                    onClick={this.props.onListSelect.bind(null, doc)}>
                    {this.getListChipContent(doc)}
                </ListItem>,
                <Divider key="div" />,
            ];
        });
    }

    render() {
        return (
            <div className="document-list">
                <div style={{display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", margin: "10px 0"}}>
                    <h1 className="page-title">Documents</h1>
                    <FloatingActionButton className="refresh-document-list" onClick={this.loadDocuments} mini backgroundColor={lightGreenA700}>
                        <Refresh />
                    </FloatingActionButton>
                </div>
                <List style={{backgroundColor: "#f5f5f5", padding: 0, maxHeight: "350px", overflowY: "auto"}}>
                    <Subheader>My Documents</Subheader>
                    {this.getDocumentsMarkup(this.state.lists.filter((list) => list.association === "owner"))}
                    <Subheader>Shared With Me</Subheader>
                    {this.getDocumentsMarkup(this.state.lists.filter((list) => list.association !== "owner"))}
                </List>
                <div style={{display: "flex", justifyContent: "flex-end", margin: "10px 0"}}>
                    <FloatingActionButton className="new-document" onClick={this.props.onListSelect.bind(null, "new")} mini backgroundColor={cyan500}>
                        <Add />
                    </FloatingActionButton>
                </div>
                <AddDocumentData document={this.state.documentDataAdd} onClose={() => this.setState({documentDataAdd: null})} />
            </div>
        );
    }
}
