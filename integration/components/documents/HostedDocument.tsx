import * as React from "react";
import * as IronWeb from "../../../src/shim";
import {logAction} from "../../Logger";
import DocumentView from "./DocumentView";
import LoadingPlaceholder from "../LoadingPlaceholder";
import {DocumentContent} from "../../componentTypes";
import {DocumentIDNameResponse, DocumentMetaResponse} from "../../../ironweb";

interface HostedDocumentProps {
    document: DocumentIDNameResponse;
    backToDocumentList: () => void;
}

interface HostedDocumentState {
    loading: boolean;
    documentMeta?: DocumentMetaResponse;
    document: DocumentContent<string | string[]> | null;
}

export default class HostedDocument extends React.Component<HostedDocumentProps, HostedDocumentState> {
    constructor(props: HostedDocumentProps) {
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
        logAction(`Retrieving document ID ${this.props.document.documentID}...`);
        IronWeb.document
            .decryptFromStore(this.props.document.documentID)
            .then((document) => {
                logAction(`Successfully retrieved and decrypted document '${document.documentName}'.`, "success");
                const content: DocumentContent<string | string[]> = JSON.parse(IronWeb.codec.utf8.fromBytes(document.data));
                this.setState({
                    loading: false,
                    document: content,
                    documentMeta: document,
                });
            })
            .catch((error: IronWeb.SDKError) => {
                logAction(`Document get/decrypt error: ${error.message}. Error Code: ${error.code}`, "error");
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
        const newList = {
            ...this.state.document,
            content: [...(this.state.document.content as string[]), todoValue],
        };

        logAction(`Updating document ID ${this.props.document.documentID}`);
        IronWeb.document
            .updateEncryptedDataInStore(this.props.document.documentID, IronWeb.codec.utf8.toBytes(JSON.stringify(newList)))
            .then(() => {
                logAction(`Successfully updated document ID ${this.props.document.documentID}`, "success");
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
            <div className="hosted-document">
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
