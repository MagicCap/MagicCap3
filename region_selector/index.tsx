import React from "react";
import ReactDOM from "react-dom";
import App from "./components/App";

// Import the styling.
import "./styles/index.scss";

// Polyfill ESM support.
window.exports = {};

ReactDOM.render(<App />, document.body);
