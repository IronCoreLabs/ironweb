import * as React from "react";
import LocalDocument from "./LocalDocument";
import {DocumentIDNameResponse} from "../../../ironweb";

interface DocumentDetailProps {
    document: DocumentIDNameResponse;
    backToList: () => void;
}

export default class DocumentDetail extends React.Component<DocumentDetailProps> {
    render() {
        return <LocalDocument document={this.props.document} backToDocumentList={this.props.backToList} />;
    }
}
