import * as React from "react";
import TextField from "material-ui/TextField";
import Button from "@material-ui/core/Button";
import {DocumentIDNameResponse, GroupMetaResponse} from "../../../ironweb";
import * as DocumentDB from "../../DocumentDB";
import * as IronWeb from "../../../src/shim";
import {Tabs, Tab} from "material-ui/Tabs";
import Checkbox from "material-ui/Checkbox";
import {logAction} from "../../Logger";
import {List, ListItem} from "material-ui/List";
import FloatingActionButton from "material-ui/FloatingActionButton";
import Chip from "material-ui/Chip";
import Avatar from "material-ui/Avatar";
import Cloud from "@material-ui/icons/Cloud";
import Local from "@material-ui/icons/CloudOff";
import Upload from "@material-ui/icons/CloudUpload";
import ArrowBack from "@material-ui/icons/ArrowBack";
import lightGreen from "@material-ui/core/colors/lightGreen";
import orange from "@material-ui/core/colors/orange";
const lightGreen200 = lightGreen["200"];
const lightGreen400 = lightGreen["400"];
const orange200 = orange["200"];
const orange400 = orange["400"];

type GrantList = {id: string}[];

interface NewDocumentProps {
    backToList(): void;
    onListSelect: (list: DocumentIDNameResponse) => void;
}

interface NewDocumentState {
    storeLocal: boolean;
    availableGroups: GroupMetaResponse[];
    selectedGroups: string[];
    todoItems: {
        [index: number]: string;
    };
}

export default class NewDocument extends React.Component<NewDocumentProps, NewDocumentState> {
    newListID!: TextField;
    newListName!: TextField;
    userGrantList!: TextField;

    constructor(props: NewDocumentProps) {
        super(props);
        this.state = {
            availableGroups: [],
            selectedGroups: [],
            todoItems: {0: ""},
            storeLocal: false,
        };
    }

    componentDidMount() {
        IronWeb.group
            .list()
            .then((groups) => this.setState({availableGroups: groups.result}))
            .catch((error: IronWeb.SDKError) => logAction(`Group list failed: ${error.message}. Error Code: ${error.code}`, "error"));
    }

    createNewList = () => {
        const listName = this.newListName.getValue();
        if (listName) {
            const todoList = Object.keys(this.state.todoItems)
                .map((todoKey) => this.state.todoItems[parseInt(todoKey)])
                .filter((todoItem) => todoItem && todoItem.length);
            const userShareList = this.userGrantList.getValue();
            const users = userShareList.split("\n").map((userID) => ({id: userID}));
            const groups = this.state.selectedGroups.map((groupID) => ({id: groupID}));
            if (this.state.storeLocal) {
                this.createLocalList(listName, todoList, users, groups);
            } else {
                this.createHostedList(listName, todoList, users, groups);
            }
        }
    };

    createLocalList = (listName: string, listItems: string[], users: GrantList, groups: GrantList) => {
        const newDocID = this.newListID.getValue();
        const document = {
            type: "list",
            content: listItems,
        };
        logAction(`Creating local document with ID '${newDocID}' and name '${listName}'`);
        const documentOptions = {
            documentID: newDocID,
            documentName: listName,
            accessList: {users, groups},
        };
        IronWeb.document
            .encrypt(IronWeb.codec.utf8.toBytes(JSON.stringify(document)), documentOptions)
            .then((encryptedDocument) => {
                DocumentDB.saveDoc(encryptedDocument.documentID, IronWeb.codec.base64.fromBytes(encryptedDocument.document), encryptedDocument.documentName);
                this.props.onListSelect(encryptedDocument);
            })
            .catch((error: IronWeb.SDKError) => {
                logAction(`Document create error: ${error.message}. Error Code: ${error.code}`, "error");
            });
    };

    createHostedList = (listName: string, listItems: string[], users: GrantList, groups: GrantList) => {
        const newDocID = this.newListID.getValue();
        const document = {
            type: "list",
            content: listItems,
        };
        logAction(`Creating hosted document with ID '${newDocID}' and name '${listName}'`);
        const documentOptions = {
            documentID: newDocID,
            documentName: listName,
            accessList: {users, groups},
        };
        IronWeb.document
            .encryptToStore(IronWeb.codec.utf8.toBytes(JSON.stringify(document)), documentOptions)
            .then((encryptedDocument) => {
                logAction(`New document successfully created.`, "success");
                this.props.onListSelect(encryptedDocument);
            })
            .catch((error: IronWeb.SDKError) => {
                logAction(`Document create error: ${error.message}. Error Code: ${error.code}`, "error");
            });
    };

    toggleStorage = () => {
        this.setState({storeLocal: !this.state.storeLocal});
    };

    setListIDRef = (input: TextField) => {
        this.newListID = input;
    };

    setListNameRef = (input: TextField) => {
        this.newListName = input;
    };

    setUserGrantListRef = (input: TextField) => {
        this.userGrantList = input;
    };

    invokeFileUploadInputClick = () => {
        const uploadInput = document.getElementById("file-upload");
        if (uploadInput) {
            uploadInput.click();
        }
    };

    onInputChange(inputID: string, _: any, newValue: string) {
        const inputIndex = parseInt(inputID);
        const stateUpdate = {[inputIndex]: newValue};

        //Check to see if we should add a new input element index into state so we can render a new input element for the next todo item
        if (this.state.todoItems[inputIndex + 1] === undefined) {
            stateUpdate[inputIndex + 1] = "";
        }
        this.setState({
            todoItems: {
                ...this.state.todoItems,
                ...stateUpdate,
            },
        });
    }

    handleFileAdd = (event: React.ChangeEvent<HTMLInputElement>) => {
        const files = event.target.files;
        if (!files || !files.length) {
            return;
        }
        const file = files[0];
        const reader = new FileReader();
        reader.onload = () => {
            if (!reader.result || !(reader.result as ArrayBuffer).byteLength) {
                return;
            }
            const documentWrapper = IronWeb.codec.utf8.toBytes(
                JSON.stringify({
                    type: file.type,
                    content: IronWeb.codec.base64.fromBytes(new Uint8Array(reader.result as ArrayBuffer)),
                })
            );
            this.state.storeLocal ? this.createLocalFile(file.name, documentWrapper) : this.createHostedFile(file.name, documentWrapper);
        };
        reader.readAsArrayBuffer(files[0]);
    };

    createHostedFile(documentName: string, documentContent: Uint8Array) {
        IronWeb.document
            .encryptToStore(documentContent, {documentName})
            .then((document) => {
                logAction(`New document successfully created.`, "success");
                this.props.onListSelect(document);
            })
            .catch((error: IronWeb.SDKError) => {
                logAction(`Document create error: ${error.message}. Error Code: ${error.code}`, "error");
            });
    }

    createLocalFile(documentName: string, documentContent: Uint8Array) {
        IronWeb.document
            .encrypt(documentContent, {documentName})
            .then((encryptedDocument) => {
                DocumentDB.saveDoc(encryptedDocument.documentID, IronWeb.codec.base64.fromBytes(encryptedDocument.document), encryptedDocument.documentName);
                logAction(`New document successfully created.`, "success");
                this.props.onListSelect(encryptedDocument);
            })
            .catch((error: IronWeb.SDKError) => {
                logAction(`Document create error: ${error.message}. Error Code: ${error.code}`, "error");
            });
    }

    onGroupGrantAccessToggle(groupID: string, _: any, isChecked: boolean) {
        if (isChecked) {
            this.setState({selectedGroups: [...this.state.selectedGroups, groupID]});
        } else {
            this.setState({selectedGroups: this.state.selectedGroups.filter((selectedGroup) => selectedGroup !== groupID)});
        }
    }

    getGroupCheckboxes() {
        const groupCheckboxes = this.state.availableGroups.map(({groupID, groupName}) => {
            return (
                <Checkbox
                    key={groupID}
                    id={groupID}
                    label={groupName || ""}
                    onCheck={this.onGroupGrantAccessToggle.bind(this, groupID)}
                    style={{width: "50%"}}
                />
            );
        });
        return (
            <div
                style={{
                    width: "50%",
                    display: "flex",
                    justifyContent: "space-around",
                    alignItems: "center",
                    flexDirection: "column",
                    maxHeight: "150px",
                    minHeight: "50px",
                    overflowY: "auto",
                }}>
                {groupCheckboxes}
            </div>
        );
    }

    getStorateTypeMarkup() {
        let color, text, avatarIcon, avatarColor;
        if (this.state.storeLocal) {
            color = orange200;
            text = "Local";
            avatarIcon = <Local />;
            avatarColor = orange400;
        } else {
            color = lightGreen200;
            text = "Hosted";
            avatarIcon = <Cloud />;
            avatarColor = lightGreen400;
        }
        return (
            <Chip
                className="storage-toggle"
                labelStyle={{padding: "0 5px", fontSize: "12px", width: "45px", textAlign: "center"}}
                onClick={this.toggleStorage}
                backgroundColor={color}>
                <Avatar icon={avatarIcon} backgroundColor={avatarColor} />
                {text}
            </Chip>
        );
    }

    getTodoInputs() {
        const inputs = Object.keys(this.state.todoItems).map((inputKey) => {
            return (
                <TextField
                    key={inputKey}
                    id={`todo-item-input-${inputKey}`}
                    type="text"
                    hintText="Todo Item"
                    style={{width: "100%", padding: "0"}}
                    value={this.state.todoItems[parseInt(inputKey)]}
                    onChange={this.onInputChange.bind(this, inputKey)}
                />
            );
        });

        return (
            <ListItem disabled style={{padding: "4px"}}>
                {inputs}
            </ListItem>
        );
    }

    render() {
        const tabStyle: React.CSSProperties = {
            textAlign: "center",
            marginTop: "15px",
        };

        return (
            <div className="new-document">
                <div style={{position: "absolute", left: 0}}>
                    <FloatingActionButton onClick={this.props.backToList} mini>
                        <ArrowBack />
                    </FloatingActionButton>
                </div>
                <div style={{display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", margin: "10px 0 25px 0"}}>
                    <h1>New Document</h1>
                    {this.getStorateTypeMarkup()}
                </div>
                <Tabs>
                    <Tab label="Todo List">
                        <div style={tabStyle}>
                            <TextField
                                id="todo-id-input"
                                autoFocus
                                ref={this.setListIDRef}
                                type="text"
                                hintText="List ID"
                                style={{width: "100%", fontSize: "22px"}}
                            />
                            <TextField
                                id="todo-name-input"
                                ref={this.setListNameRef}
                                type="text"
                                hintText="List Name"
                                style={{width: "100%", fontSize: "22px"}}
                            />
                            <List style={{backgroundColor: "#f5f5f5", padding: "0", marginBottom: "10px", maxHeight: "275px", overflowY: "auto"}}>
                                {this.getTodoInputs()}
                            </List>
                            <div>
                                <div>Share on Create</div>
                                <div style={{display: "flex"}}>
                                    <TextField
                                        ref={this.setUserGrantListRef}
                                        multiLine
                                        id="userAccessID"
                                        type="text"
                                        hintText="User IDs to Grant Access To (1 per line)"
                                        style={{width: "50%"}}
                                    />
                                    {this.getGroupCheckboxes()}
                                </div>
                            </div>
                            <Button variant="contained" className="submit-new-document" onClick={this.createNewList}>
                                Create New Document
                            </Button>
                        </div>
                    </Tab>
                    <Tab label="File Upload">
                        <div style={tabStyle}>
                            <h3>Upload file</h3>
                            <FloatingActionButton onClick={this.invokeFileUploadInputClick} mini>
                                <Upload />
                            </FloatingActionButton>
                            <input id="file-upload" type="file" onChange={this.handleFileAdd} style={{display: "none"}} />
                        </div>
                    </Tab>
                </Tabs>
            </div>
        );
    }
}
