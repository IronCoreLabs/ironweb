import * as React from "react";
import {render} from "react-dom";
import TodoApp from "./components/TodoApp";
//Auto polyfill promises and fetch, which is needed for getting our JWT
import "es6-promise/auto";
import "whatwg-fetch";

render(<TodoApp />, document.getElementById("root"));
