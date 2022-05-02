"use strict";

const { ipcRenderer, contextBridge } = require("electron");

let requestId = 0;

contextBridge.exposeInMainWorld(
    "mainRequest",
    data => new Promise((res, rej) => {
        const id = (requestId++).toString();
        ipcRenderer.once(`config:request:${id}`, (_, apiResult) => {
            if (apiResult.err !== undefined) rej(new Error(apiResult.err));
            else res(apiResult.data);
        });
        ipcRenderer.send("config:request", {id, data});
    })
);

contextBridge.exposeInMainWorld(
    "onCapture",
    f => {
        function cb(_, capture) {
            f(capture);
        }
        ipcRenderer.on("config:capture", cb);
        return () => ipcRenderer.removeListener("config:capture", cb);
    }
);

contextBridge.exposeInMainWorld(
    "onHotkey",
    f => {
        function cb(_, hotkey) {
            f(hotkey);
        }
        ipcRenderer.on("config:hotkey", cb);
        return () => ipcRenderer.removeListener("config:hotkey", cb);
    }
);

contextBridge.exposeInMainWorld(
    "onOAuth2",
    (id, f) => {
        function cb(_, params) {
            f(...params);
        }
        ipcRenderer.on(`config:oauth2:${id}`, cb);
        return () => ipcRenderer.removeListener(`config:oauth2:${id}`, cb);
    }
);

contextBridge.exposeInMainWorld("__dirname", __dirname);
