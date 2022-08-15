import * as React from "react";
import * as IronWeb from "../../../src/shim";
import {logAction} from "../../Logger";
import LoadingPlaceholder from "../LoadingPlaceholder";
import Divider from "@material-ui/core/Divider";
import TodoList from "./TodoList";
import FileDocument from "./FileDocument";
import DocumentVisiblity from "./DocumentVisibility";
import TextField from "@material-ui/core/TextField";
import Fab from "@material-ui/core/Fab";
import ArrowBack from "@material-ui/icons/ArrowBack";
import Refresh from "@material-ui/icons/Refresh";
import lightGreen from "@material-ui/core/colors/lightGreen";
const lightGreenA700 = lightGreen.A700;
import {DocumentContent} from "../../componentTypes";
import {DocumentMetaResponse} from "../../../ironweb";

interface DocumentViewProps {
    loading: boolean;
    documentMeta: DocumentMetaResponse;
    document: DocumentContent<string | string[]> | null;
    onAddTodo(item: string): void;
    loadDocument(): void;
    loadDocumentMetadata(): void;
    backToDocumentList(): void;
}

interface DocumentViewState {
    name: string;
    nameChanging: boolean;
}

export default class DocumentView extends React.Component<DocumentViewProps, DocumentViewState> {
    constructor(props: DocumentViewProps) {
        super(props);
        this.state = {
            name: props.documentMeta.documentName || "",
            nameChanging: false,
        };
    }

    updateDocumentName = () => {
        if (this.state.name !== this.props.documentMeta.documentName) {
            this.setState({nameChanging: true});
            IronWeb.document
                .updateName(this.props.documentMeta.documentID, this.state.name)
                .then((document) => {
                    logAction(`Successfully updated document name to ${document.documentName}`);
                    this.setState({
                        name: document.documentName || "",
                        nameChanging: false,
                    });
                    this.props.loadDocumentMetadata();
                })
                .catch((error: IronWeb.SDKError) => {
                    logAction(`Document name update error: ${error.message}. Error Code: ${error.code}`, "error");
                    this.setState({
                        nameChanging: false,
                    });
                });
        }
    };

    getDocumentContent() {
        if (!this.props.document || !this.props.documentMeta) {
            return null;
        }
        if (this.props.document.type === "list") {
            return <TodoList todos={this.props.document.content as string[]} onAddTodo={this.props.onAddTodo} />;
        }
        return (
            <FileDocument
                content={this.props.document.content as string}
                mimeType={this.props.document.type}
                fileName={this.props.documentMeta.documentName || ""}
            />
        );
    }

    getDocumentDetails() {
        if (this.props.loading || !this.props.documentMeta) {
            return <LoadingPlaceholder />;
        }

        return (
            <div style={{minHeight: "300px", display: "flex", padding: "10px 0 0"}} className="document-view-details">
                {this.getDocumentContent()}
                <DocumentVisiblity
                    documentID={this.props.documentMeta.documentID}
                    visibleTo={this.props.documentMeta.visibleTo}
                    association={this.props.documentMeta.association}
                    loadDocumentMetadata={this.props.loadDocumentMetadata}
                />
            </div>
        );
    }

    render() {
        return (
            <div className="document-view">
                <div style={{display: "flex", justifyContent: "space-around"}}>
                    <Fab className="back-to-document-list" onClick={this.props.backToDocumentList} size="small">
                        <ArrowBack />
                    </Fab>
                    <Fab
                        className="refresh-document-view"
                        onClick={this.props.loadDocument}
                        size="small"
                        color="primary"
                        classes={{
                            primary: lightGreenA700,
                        }}>
                        <Refresh />
                    </Fab>
                </div>
                <div style={{textAlign: "center", marginBottom: 7}}>
                    <div className="document-name" style={{fontSize: 24, paddingBottom: 5}}>
                        {this.state.nameChanging ? (
                            <LoadingPlaceholder />
                        ) : (
                            <TextField
                                id="documentName"
                                value={this.state.name}
                                onBlur={this.updateDocumentName}
                                onChange={(e) => this.setState({name: e.target.value})}
                            />
                        )}
                    </div>
                    {this.props.documentMeta ? (
                        <div className="document-association" style={{fontSize: 13}}>
                            {this.props.documentMeta.association}
                        </div>
                    ) : null}
                    <div className="document-id" style={{fontSize: "13px"}}>{`ID: ${this.props.documentMeta.documentID}`}</div>
                    <div style={{fontSize: 13}}>{`Created: ${new Date(this.props.documentMeta.created).toLocaleDateString()}`}</div>
                    <div style={{fontSize: 13}}>{`Updated: ${new Date(this.props.documentMeta.updated).toLocaleDateString()}`}</div>
                </div>
                <Divider />
                {this.getDocumentDetails()}
            </div>
        );
    }
}
