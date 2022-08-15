import * as React from "react";
import {List, ListItem, ListItemIcon, ListItemText, TextField, TextFieldProps} from "@material-ui/core";
import LoadingPlaceholder from "../LoadingPlaceholder";
import {Label} from "@material-ui/icons";

interface TodoListProps {
    todos: string[];
    onAddTodo(item: string): void;
}
interface TodoListState {
    updatingList: boolean;
}

const listStyles: React.CSSProperties = {
    maxHeight: "250px",
    minHeight: "10px",
    overflow: "auto",
    backgroundColor: "#f5f5f5",
    padding: "4px 0",
    marginBottom: "10px",
};

export default class TodoList extends React.Component<TodoListProps, TodoListState> {
    todoInput!: React.RefObject<TextFieldProps>;

    constructor(props: TodoListProps) {
        super(props);
        this.state = {
            updatingList: false,
        };
    }

    componentDidUpdate(prevProps: TodoListProps) {
        if (prevProps.todos.length !== this.props.todos.length) {
            this.setState({updatingList: false}, () => {
                this.todoInput.current!.value = "";
            });
        }
    }

    handleEnter = (event: React.KeyboardEvent<HTMLInputElement>) => {
        if (event.charCode === 13) {
            this.addTodo();
        }
    };

    addTodo = () => {
        const todoValue = this.todoInput.current?.value as string;
        if (!todoValue) {
            return;
        }
        this.setState({updatingList: true});
        this.props.onAddTodo(todoValue);
    };

    setTodoRef = (todoInput: React.RefObject<TextFieldProps>) => {
        this.todoInput = todoInput;
    };

    getTodoItems() {
        if (this.props.todos.length === 0) {
            return (
                <ListItem className="todo-list-empty" disabled>
                    <ListItemIcon>
                        <Label />
                    </ListItemIcon>
                    <ListItemText primary="No Todos Created!" />
                </ListItem>
            );
        }
        return this.props.todos.map((todo, index) => (
            <ListItem className="todo-list-item" key={index} disabled>
                <ListItemIcon>
                    <Label />
                </ListItemIcon>
                <ListItemText primary={todo} />
            </ListItem>
        ));
    }

    render() {
        return (
            <div className="todo-list" style={{borderRight: "1px solid #e0e0e0", width: "50%", padding: "5px"}}>
                <div style={{fontSize: "18px", textAlign: "center", paddingBottom: "5px"}}>List Content</div>
                <List style={listStyles}>{this.getTodoItems()}</List>
                {this.state.updatingList ? (
                    <LoadingPlaceholder />
                ) : (
                    <TextField
                        id="newTodoItem"
                        autoFocus
                        type="text"
                        onKeyPress={this.handleEnter}
                        inputRef={this.setTodoRef}
                        helperText="Add New Todo"
                        style={{width: "100%", marginBottom: "10px"}}
                    />
                )}
            </div>
        );
    }
}
