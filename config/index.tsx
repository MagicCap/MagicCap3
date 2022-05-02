import React from "react";
import ReactDOM from "react-dom";
import App from "./components/App";

// Polyfill ESM support.
window.exports = {};

ReactDOM.render(<App />, document.getElementById("app"));
