import * as React from "react";
import TextField, {TextFieldProps} from "@material-ui/core/TextField";
import Button from "@material-ui/core/Button";
import Dialog from "@material-ui/core/Dialog";
import {DocumentAssociationResponse} from "../../../ironweb";
import {saveDoc} from "../../DocumentDB";
import {DialogActions, DialogContent} from "@material-ui/core";

interface AddDocumentDataProps {
    document: DocumentAssociationResponse | null;
    onClose(): void;
}

export default class AddDocumentData extends React.Component<AddDocumentDataProps> {
    documentData!: React.RefObject<TextFieldProps>;

    constructor(props: AddDocumentDataProps) {
        super(props);
        this.documentData = React.createRef<TextFieldProps>();
    }

    uploadData = () => {
        const data = this.documentData.current?.value as string;
        if (!data) {
            return;
        }
        saveDoc(this.props.document!.documentID, data, this.props.document!.documentName);
        this.props.onClose();
    };

    getModalContent() {
        const setDocumentDataInput = (ref: React.RefObject<TextFieldProps>) => {
            this.documentData = ref;
        };
        return <TextField inputRef={setDocumentDataInput} label="Document Data (Base64 Encoded)" autoFocus multiline rows={3} style={{width: "75%"}} />;
    }

    render() {
        return (
            <Dialog open={this.props.document !== null} title="Add Document Data" onClose={this.props.onClose}>
                <DialogContent>{this.getModalContent()}</DialogContent>
                <DialogActions>
                    <Button key="data" color="primary" onClick={this.uploadData}>
                        Upload Data
                    </Button>
                </DialogActions>
            </Dialog>
        );
    }
}
