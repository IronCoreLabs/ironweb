import * as React from "react";
import * as IronWeb from "../../../src/shim";
import {logAction} from "../../Logger";
import * as DocumentDB from "../../DocumentDB";
import DocumentView from "./DocumentView";
import LoadingPlaceholder from "../LoadingPlaceholder";
import {DocumentContent} from "../../componentTypes";
import {DocumentMetaResponse, DocumentIDNameResponse} from "../../../ironweb";

interface LocalDocumentProps {
    document: DocumentIDNameResponse;
    backToDocumentList: () => void;
}

interface LocalDocumentState {
    loading: boolean;
    documentMeta?: DocumentMetaResponse;
    document: DocumentContent<string | string[]> | null;
}

export default class LocalList extends React.Component<LocalDocumentProps, LocalDocumentState> {
    constructor(props: LocalDocumentProps) {
        super(props);
        this.state = {
            loading: true,
            document: null,
        };
    }

    componentDidMount() {
        this.loadDocument();
    }

    loadDocument = () => {
        logAction(`Retrieving local document ${this.props.document.documentName}...`);
        const encryptedDoc = DocumentDB.getDoc(this.props.document.documentID);
        IronWeb.document
            .decrypt(encryptedDoc.id, IronWeb.codec.base64.toBytes(encryptedDoc.content))
            .then((decryptedDocument) => {
                const content: DocumentContent<string | string[]> = JSON.parse(IronWeb.codec.utf8.fromBytes(decryptedDocument.data));
                this.setState({
                    loading: false,
                    document: content,
                    documentMeta: decryptedDocument,
                });
            })
            .catch((error: IronWeb.SDKError) => {
                logAction(`Document get error: ${error.message}. Error Code: ${error.code}`, "error");
            });
    };

    loadDocumentMetadata = () => {
        IronWeb.document
            .getMetadata(this.props.document.documentID)
            .then((docMetadata) => {
                this.setState({
                    documentMeta: docMetadata,
                });
            })
            .catch((error: IronWeb.SDKError) => {
                logAction(`Document meta get error: ${error.message}. Error Code: ${error.code}`, "error");
            });
    };

    addTodo = (todoValue: string) => {
        if (!todoValue || !this.state.document) {
            return;
        }
        const existingDoc = DocumentDB.getDoc(this.props.document.documentID);
        const newList = {
            ...this.state.document,
            content: [...(this.state.document.content as string[]), todoValue],
        };

        logAction(`Updating local list ${this.props.document.documentName}`);
        IronWeb.document
            .updateEncryptedData(existingDoc.id, IronWeb.codec.utf8.toBytes(JSON.stringify(newList)))
            .then((encryptedDocument) => {
                DocumentDB.updateDoc(encryptedDocument.documentID, IronWeb.codec.utf8.fromBytes(encryptedDocument.document), encryptedDocument.documentName);
                logAction(`Successfully updated document ${this.props.document.documentName}`, "success");
                this.setState({
                    document: newList,
                });
            })
            .catch((error: IronWeb.SDKError) => {
                logAction(`Document update error: ${error.message}. Error Code: ${error.code}`, "error");
            });
    };

    render() {
        if (this.state.loading) {
            return <LoadingPlaceholder />;
        }
        return (
            <div className="local-document">
                <DocumentView
                    loading={this.state.loading}
                    documentMeta={this.state.documentMeta!}
                    document={this.state.document}
                    onAddTodo={this.addTodo}
                    loadDocument={this.loadDocument}
                    loadDocumentMetadata={this.loadDocumentMetadata}
                    backToDocumentList={this.props.backToDocumentList}
                />
            </div>
        );
    }
}
