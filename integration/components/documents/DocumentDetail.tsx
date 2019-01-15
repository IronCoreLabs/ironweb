import * as React from "react";
import {isLocalDocument} from "../../DocumentDB";
import LocalDocument from "./LocalDocument";
import HostedDocument from "./HostedDocument";
import {DocumentIDNameResponse} from "../../../ironweb";

interface DocumentDetailProps {
    document: DocumentIDNameResponse;
    backToList: () => void;
}

export default class DocumentDetail extends React.Component<DocumentDetailProps, {}> {
    render() {
        if (isLocalDocument(this.props.document.documentID)) {
            return <LocalDocument document={this.props.document} backToDocumentList={this.props.backToList} />;
        }
        return <HostedDocument document={this.props.document} backToDocumentList={this.props.backToList} />;
    }
}
