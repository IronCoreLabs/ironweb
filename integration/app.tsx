import * as React from "react";
import {render as reactRender} from "react-dom";
import {AppContainer} from "react-hot-loader";
import TodoApp from "./components/TodoApp";
//Auto polyfill promises and fetch, which is needed for getting our JWT
import "es6-promise/auto";
import "whatwg-fetch";

const render = (RootApp: any) => {
    reactRender(
        <AppContainer>
            <RootApp />
        </AppContainer>,
        document.getElementById("root")
    );
};

render(TodoApp);

if (module.hot) {
    module.hot.accept("./components/TodoApp", () => {
        const NextTodoApp = (require("./components/TodoApp") as {default: React.ReactType}).default;
        render(NextTodoApp);
    });
}
