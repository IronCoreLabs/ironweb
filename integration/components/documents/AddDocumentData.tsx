import * as React from "react";
import TextField from "material-ui/TextField";
import Button from "@material-ui/core/Button";
import Dialog from "material-ui/Dialog";
import {DocumentAssociationResponse} from "../../../ironweb";
import {saveDoc} from "../../DocumentDB";

interface AddDocumentDataProps {
    document: DocumentAssociationResponse | null;
    onClose(): void;
}

export default class AddDocumentData extends React.Component<AddDocumentDataProps> {
    documentData!: TextField;

    uploadData = () => {
        const data = this.documentData.getValue();
        if (!data) {
            return;
        }
        saveDoc(this.props.document!.documentID, data, this.props.document!.documentName);
        this.props.onClose();
    };

    getModalContent() {
        const setDocumentDataInput = (input: TextField) => {
            this.documentData = input;
        };
        return <TextField ref={setDocumentDataInput} floatingLabelText="Document Data (Base64 Encoded)" autoFocus multiLine rows={3} style={{width: "75%"}} />;
    }

    render() {
        const modalAction = [
            <Button key="data" color="primary" onClick={this.uploadData}>
                Upload Data
            </Button>,
        ];

        return (
            <Dialog modal={false} open={this.props.document !== null} title="Add Document Data" onRequestClose={this.props.onClose} actions={modalAction}>
                {this.getModalContent()}
            </Dialog>
        );
    }
}
