import * as React from "react";
import * as IronWeb from "../../../src/shim";
import FloatingActionButton from "material-ui/FloatingActionButton";
import Download from "@material-ui/icons/CloudDownload";

interface FileDocumentProps {
    content: string;
    mimeType: string;
    fileName: string;
}

export default class FileDocument extends React.Component<FileDocumentProps> {
    getImageDocumentMarkup() {
        return <img src={`data:${this.props.mimeType};base64, ${this.props.content}`} style={{maxWidth: "100%", maxHeight: "100%"}} />;
    }

    downloadFile = () => {
        const documentBytes = IronWeb.codec.base64.toBytes(this.props.content);
        const blob = new Blob([documentBytes], {type: this.props.mimeType});
        const link = document.createElement("a");
        link.href = window.URL.createObjectURL(blob);
        link.download = this.props.fileName;
        link.click();
    };

    getGenericFileMarkup() {
        return (
            <div style={{display: "flex", justifyContent: "center", marginTop: "15px"}}>
                <FloatingActionButton onClick={this.downloadFile}>
                    <Download />
                </FloatingActionButton>
            </div>
        );
    }

    render() {
        const documentContent = this.props.mimeType.match(/image\/*/) ? this.getImageDocumentMarkup() : this.getGenericFileMarkup();

        return (
            <div style={{borderRight: "1px solid #e0e0e0", width: "50%", padding: "5px"}}>
                <div style={{fontSize: "18px", textAlign: "center", paddingBottom: "5px"}}>Document Content</div>
                {documentContent}
            </div>
        );
    }
}
