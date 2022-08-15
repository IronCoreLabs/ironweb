import * as React from "react";
import {Button, TextField, Tabs, Tab, List, ListItem, Checkbox, Fab, Chip, TextFieldProps, FormControlLabel} from "@material-ui/core";
import {DocumentIDNameResponse, GroupMetaResponse} from "../../../ironweb";
import * as DocumentDB from "../../DocumentDB";
import * as IronWeb from "../../../src/shim";
import {logAction} from "../../Logger";
import {Cloud, CloudOff as Local, CloudUpload as Upload, ArrowBack} from "@material-ui/icons";
import lightGreen from "@material-ui/core/colors/lightGreen";
import orange from "@material-ui/core/colors/orange";
import {TabPanel} from "../TabPanel";
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
    tabIndex: number;
}

export default class NewDocument extends React.Component<NewDocumentProps, NewDocumentState> {
    newListID!: React.RefObject<TextFieldProps>;
    newListName!: React.RefObject<TextFieldProps>;
    userGrantList!: React.RefObject<TextFieldProps>;

    constructor(props: NewDocumentProps) {
        super(props);
        this.state = {
            availableGroups: [],
            selectedGroups: [],
            todoItems: {0: ""},
            storeLocal: false,
            tabIndex: 0,
        };
        this.newListID = React.createRef();
        this.newListName = React.createRef();
        this.userGrantList = React.createRef();
    }

    componentDidMount() {
        IronWeb.group
            .list()
            .then((groups) => this.setState({availableGroups: groups.result}))
            .catch((error: IronWeb.SDKError) => logAction(`Group list failed: ${error.message}. Error Code: ${error.code}`, "error"));
    }

    createNewList = () => {
        const listName = this.newListName.current?.value as string;
        if (listName) {
            const todoList = Object.keys(this.state.todoItems)
                .map((todoKey) => this.state.todoItems[parseInt(todoKey)])
                .filter((todoItem) => todoItem && todoItem.length);
            const userShareList = this.userGrantList.current?.value as string;
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
        const newDocID = this.newListID.current?.value as string;
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
        const newDocID = this.newListID.current?.value as string;
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

    setListIDRef = (input: React.RefObject<TextFieldProps>) => {
        this.newListID = input;
    };

    setListNameRef = (input: React.RefObject<TextFieldProps>) => {
        this.newListName = input;
    };

    setUserGrantListRef = (input: React.RefObject<TextFieldProps>) => {
        this.userGrantList = input;
    };

    invokeFileUploadInputClick = () => {
        const uploadInput = document.getElementById("file-upload");
        if (uploadInput) {
            uploadInput.click();
        }
    };

    onInputChange(inputID: string, newValue: string): void {
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
                <FormControlLabel
                    key={groupID}
                    control={<Checkbox id={groupID} onChange={this.onGroupGrantAccessToggle.bind(this, groupID)} style={{width: "50%"}} />}
                    label={groupName || ""}
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
        let color, text, avatarIcon;
        if (this.state.storeLocal) {
            color = orange200;
            text = "Local";
            avatarIcon = <Local htmlColor={orange400} />;
        } else {
            color = lightGreen200;
            text = "Hosted";
            avatarIcon = <Cloud htmlColor={lightGreen400} />;
        }
        return (
            <Chip
                className="storage-toggle"
                classes={{
                    colorPrimary: color,
                }}
                onClick={this.toggleStorage}
                icon={avatarIcon}
                label={text}
                color="primary"
            />
        );
    }

    getTodoInputs() {
        const inputs = Object.keys(this.state.todoItems).map((inputKey) => {
            return (
                <TextField
                    key={inputKey}
                    id={`todo-item-input-${inputKey}`}
                    type="text"
                    helperText="Todo Item"
                    style={{width: "100%", padding: "0"}}
                    value={this.state.todoItems[parseInt(inputKey)]}
                    onChange={(e) => this.onInputChange(inputKey, e.target.value)}
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
                    <Fab onClick={this.props.backToList} size="small">
                        <ArrowBack />
                    </Fab>
                </div>
                <div style={{display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", margin: "10px 0 25px 0"}}>
                    <h1>New Document</h1>
                    {this.getStorateTypeMarkup()}
                </div>
                <Tabs value={this.state.tabIndex} onChange={(_: React.ChangeEvent<Record<string, unknown>>, newValue) => this.setState({tabIndex: newValue})}>
                    <Tab label="Todo List" />
                    <Tab label="File Upload" />
                </Tabs>
                <TabPanel value={this.state.tabIndex} index={0} style={tabStyle}>
                    <TextField
                        id="todo-id-input"
                        autoFocus
                        inputRef={this.setListIDRef}
                        type="text"
                        helperText="List ID"
                        style={{width: "100%", fontSize: "22px"}}
                    />
                    <TextField
                        id="todo-name-input"
                        inputRef={this.setListNameRef}
                        type="text"
                        helperText="List Name"
                        style={{width: "100%", fontSize: "22px"}}
                    />
                    <List style={{backgroundColor: "#f5f5f5", padding: "0", marginBottom: "10px", maxHeight: "275px", overflowY: "auto"}}>
                        {this.getTodoInputs()}
                    </List>
                    <div>
                        <div>Share on Create</div>
                        <div style={{display: "flex"}}>
                            <TextField
                                inputRef={this.setUserGrantListRef}
                                multiline
                                id="userAccessID"
                                type="text"
                                helperText="User IDs to Grant Access To (1 per line)"
                                style={{width: "50%"}}
                            />
                            {this.getGroupCheckboxes()}
                        </div>
                    </div>
                    <Button variant="contained" className="submit-new-document" onClick={this.createNewList}>
                        Create New Document
                    </Button>
                </TabPanel>
                <TabPanel value={this.state.tabIndex} index={1} style={tabStyle}>
                    <h3>Upload file</h3>
                    <Fab onClick={this.invokeFileUploadInputClick} size="small">
                        <Upload />
                    </Fab>
                    <input id="file-upload" type="file" onChange={this.handleFileAdd} style={{display: "none"}} />
                </TabPanel>
            </div>
        );
    }
}
