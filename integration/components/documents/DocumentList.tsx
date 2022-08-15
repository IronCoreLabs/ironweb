import Chip from "@material-ui/core/Chip";
import Divider from "@material-ui/core/Divider";
import Fab from "@material-ui/core/Fab";
import List from "@material-ui/core/List";
import ListItem from "@material-ui/core/ListItem";
import brown from "@material-ui/core/colors/brown";
import cyan from "@material-ui/core/colors/cyan";
import lightGreen from "@material-ui/core/colors/lightGreen";
import orange from "@material-ui/core/colors/orange";
const brown200 = brown["200"];
const brown400 = brown["400"];
const cyan500 = cyan["500"];
const lightGreen200 = lightGreen["200"];
const lightGreen400 = lightGreen["400"];
const lightGreenA700 = lightGreen.A700;
const orange200 = orange["200"];
const orange400 = orange["400"];
import Assignment from "@material-ui/icons/Assignment";
import Add from "@material-ui/icons/Add";
import Cloud from "@material-ui/icons/Cloud";
import Local from "@material-ui/icons/CloudOff";
import Refresh from "@material-ui/icons/Refresh";
import Group from "@material-ui/icons/GroupAdd";
import Person from "@material-ui/icons/PersonAdd";
import * as React from "react";
import {DocumentAssociation, DocumentAssociationResponse, DocumentIDNameResponse} from "../../../ironweb";
import * as IronWeb from "../../../src/shim";
import {isLocalDocument} from "../../DocumentDB";
import {logAction} from "../../Logger";
import AddDocumentData from "./AddDocumentData";
import {ListItemIcon, ListItemText} from "@material-ui/core";

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
            icon = <Person htmlColor={brown400} />;
            text = "User";
        } else {
            icon = <Group htmlColor={brown400} />;
            text = "Group";
        }

        return (
            <Chip
                icon={icon}
                label={text}
                color="primary"
                classes={{
                    colorPrimary: brown200,
                }}
            />
        );
    }

    openManualDataInput = (event: React.MouseEvent<HTMLDivElement, MouseEvent>, document: DocumentAssociationResponse, isLocal: boolean) => {
        event.stopPropagation();
        if (isLocal) {
            return;
        }
        this.setState({documentDataAdd: document});
    };

    getListChipContent(document: DocumentAssociationResponse) {
        let icon, text, color;
        const isLocal = isLocalDocument(document.documentID);
        if (isLocal) {
            icon = <Local htmlColor={orange400} />;
            text = "Local";
            color = orange200;
        } else {
            icon = <Cloud htmlColor={lightGreen400} />;
            text = "Hosted";
            color = lightGreen200;
        }

        return (
            <div style={{display: "flex", float: "right"}}>
                <Chip
                    className={`storage-type-${text.toLowerCase()}`}
                    onClick={(e) => this.openManualDataInput(e, document, isLocal)}
                    label={text}
                    icon={icon}
                    color="primary"
                    classes={{
                        colorPrimary: color,
                    }}
                />
                {this.getAssociationChip(document.association)}
            </div>
        );
    }

    getDocumentsMarkup(documents: DocumentAssociationResponse[]) {
        if (documents.length === 0) {
            return (
                <ListItem disabled>
                    <ListItemText primary="No Documents!" />
                </ListItem>
            );
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
                <ListItem className="document-list-item" key={doc.documentID} onClick={this.props.onListSelect.bind(null, doc)}>
                    <ListItemIcon>
                        <Assignment style={{paddingTop: "7px"}} />
                    </ListItemIcon>
                    <ListItemText primary={rowName} secondary={docDates} />
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
                    <Fab
                        className="refresh-document-list"
                        onClick={this.loadDocuments}
                        size="small"
                        color="primary"
                        classes={{
                            primary: lightGreenA700,
                        }}>
                        <Refresh />
                    </Fab>
                </div>
                <List style={{backgroundColor: "#f5f5f5", padding: 0, maxHeight: "350px", overflowY: "auto"}}>{this.getDocumentsMarkup(this.state.lists)}</List>
                <div style={{display: "flex", justifyContent: "flex-end", margin: "10px 0"}}>
                    <Fab className="new-document" onClick={this.props.onListSelect.bind(null, "new")} size="small" color="primary" classes={{primary: cyan500}}>
                        <Add />
                    </Fab>
                </div>
                <AddDocumentData document={this.state.documentDataAdd} onClose={() => this.setState({documentDataAdd: null})} />
            </div>
        );
    }
}
