import React from "react";
import { decode } from "base64-arraybuffer";
import { ipcRenderer } from "electron";
import { EditorDone, SelectorDone, SelectorScreenSpecificConfig, ToolboxItem } from "../../sharedTypes";
import * as announcement from "../utils/announcement";
import { Pointer } from "../utils/pointer";
import Toolbox from "./Toolbox";
import Crosshair from "./Crosshair";
import Magnifier from "./Magnifier";
import SelectedRegion from "./SelectedRegion";
import EditedRegions from "./EditedRegions";
import Tooltip from "./Tooltip";

export default () => {
    // Defines the image that will be used as the background image for the region selector.
    const [imageUrl, setImageUrl] = React.useState<string | null>(null);

    // Defines the toolbox items that were passed in.
    let [toolboxItems, setToolboxItems] = React.useState<ToolboxItem[]>([]);

    // Defines the toolbox index. 0 is always the selector.
    let [toolboxIndex, setToolboxIndex] = React.useState(0);

    // Defines the positon if the cursor is currently on this display.
    let [cursorPos, setCursorPos] = React.useState<{x: number; y: number} | null>(null);

    // Defines the bounds of the display.
    let [displayBounds, setDisplayBounds] = React.useState<{x: number; y: number; width: number; height: number} | null>(null);

    // Defines the selection start.
    let [selectionStart, setSelectionStart] = React.useState<{x: number; y: number} | null>(null);

    // Defines the editors.
    const [editors, setEditors] = React.useState<Pointer<{top: number; left: number; width: number; height: number; imgUrl: string}[]>>({to: []});

    // Defines the active tooltip.
    const [tooltip, setTooltip] = React.useState<{top: number; left: number; text: string} | null>(null);

    // Defines the scale.
    let [scale, setScale] = React.useState<number>(1);

    // Defines the notch.
    const [notch, setNotch] = React.useState(0);

    // Defines the RGB value.
    let [rgb, setRgb] = React.useState<[number, number, number]>([255, 0, 0]);

    // Called when a region selector is destroyed.
    const destroy = () => {
        cursorPos = null;
        selectionStart = null;
        toolboxIndex = 0;
        editors.to = [];
        setEditors({to: editors.to});
        setToolboxIndex(0);
        setImageUrl(null);
        setCursorPos(null);
        setSelectionStart(null);
        setTooltip(null);
    };

    // Called when the selector is done.
    const done = (start: {x: number; y: number} | null, end: {x: number; y: number} | null) => {
        try {
            // Handle if this was cancelled.
            if (!start || !end) {
                ipcRenderer.send(`selector:done:${window.location.hash.substr(1)}`, {cancelled: true} as SelectorDone);
                return;
            }

            // Establish the top left/bottom right coordinates.
            const topLeft = {x: Math.min(start.x, end.x), y: Math.min(start.y, end.y)};
            const bottomRight = {x: Math.max(start.x, end.x), y: Math.max(start.y, end.y)};

            // Defines the response body.
            const response: SelectorDone = {
                cancelled: false,
                height: bottomRight.y - topLeft.y,
                width: bottomRight.x - topLeft.x,
                relativeLeft: topLeft.x,
                relativeTop: topLeft.y,
            };

            // Send the body.
            ipcRenderer.send(`selector:done:${window.location.hash.substr(1)}`, response);
        } finally {
            // Call the destroy function.
            destroy();            
        }
    };

    // Handle the events from the main process.
    React.useEffect(() => {
        // Handle the initialisation event.
        ipcRenderer.on("selector:config", (_: any, body: SelectorScreenSpecificConfig) => {
            // Set the display bounds.
            displayBounds = body.displayBounds;
            setDisplayBounds(displayBounds);

            // Set the display scale.
            scale = body.scale;
            setScale(scale);

            // Set the toolbox items.
            toolboxItems = body.toolboxItems;
            setToolboxItems(toolboxItems);

            // Set the cursor position.
            cursorPos = body.cursorPosition;
            setCursorPos(cursorPos);

            // Set the notch.
            setNotch(body.notch);

            // Set the image.
            setImageUrl(URL.createObjectURL(new Blob([decode(body.image)], {type: "image/png"})));

            // Dispatch that we are ready.
            ipcRenderer.send(`selector:ready:${window.location.hash.substr(1)}`);
        });

        // Handle the destroy event.
        ipcRenderer.on("selector:destroy", destroy);

        // Handle the editor event.
        ipcRenderer.on("selector:editor_done", (_: any, payload: any) => {
            // Handle errors.
            if (payload.err !== undefined) throw new Error(`Error with editor ${payload.id}: ${payload.err}`);

            // If this isn't an error, get the data from the payload.
            const buf = decode(payload.enc);
            const origin = payload.origin as EditorDone;

            // Handle pushing the editor and updating the pointer.
            editors.to.push({
                imgUrl: URL.createObjectURL(new Blob([buf], {type: "image/png"})),
                top: origin.relativeTop, left: origin.relativeLeft, width: origin.width,
                height: origin.height,
            });
            setEditors({to: editors.to});
        });

        // Handle RGB changes.
        announcement.on("rgb", (_: any, innerRgb: [number, number, number]) => {
            rgb = innerRgb;
            setRgb(rgb);
        });

        // Handle invalidation.
        announcement.on("invalidate", (self: boolean) => {
            if (!self) {
                cursorPos = null;
                setCursorPos(null);
            }
        });

        // Handle the editor changing.
        announcement.on("editor_change", (_: any, editorIndex: number) => {
            toolboxIndex = editorIndex;
            setToolboxIndex(editorIndex);
        });

        // Handle the mouse move event.
        window.addEventListener("mousemove", (e: MouseEvent) => {
            // If the cursor was not on this display, send the invalidation event.
            if (!cursorPos) announcement.dispatch("invalidate", null);

            // Handle tooltips.
            let el = e.target as HTMLElement;
            let tooltip;
            while (el) {
                if (el.dataset.tooltip) {
                    tooltip = el.dataset.tooltip;
                    break;
                }
                el = el.parentElement!;
            }
            if (tooltip) {
                // Set to the bottom of the item.
                const rect = el.getBoundingClientRect();
                setTooltip({top: rect.bottom, left: rect.left, text: tooltip});
            } else {
                // Set the tooltip to null.
                setTooltip(null);
            }

            // Set the cursor position.
            cursorPos = {x: e.x, y: e.y};
            setCursorPos(cursorPos);
        });

        // Handle setting the toolbox to where an ID is.
        const toolboxWhere = (id: string) => {
            for (let i = 0; i < toolboxItems.length; i++) {
                if (toolboxItems[i].id === id) {
                    toolboxIndex = i;
                    setToolboxIndex(i);
                    return;
                }
            }
        };

        // Handle key events.
        window.addEventListener("keydown", (e: KeyboardEvent) => {
            switch (e.key) {
                case "Escape": {
                    if (selectionStart) {
                        selectionStart = null;
                        setSelectionStart(null);
                    }
                    else done(null, null);
                    break;
                }
                case "f": {
                    done({x: 0, y: 0}, {x: displayBounds!.width, y: displayBounds!.height});
                    break;
                }
                case "z": {
                    if (e.ctrlKey || e.metaKey) {
                        editors.to.pop();
                        setEditors({to: editors.to});
                        ipcRenderer.send(`selector:undo:${window.location.hash.substr(1)}`);
                    }
                    break;
                }
                case " ":
                case "s": {
                    toolboxIndex = 0;
                    setToolboxIndex(0);
                    break;
                }
                case "b": {
                    toolboxWhere("blur");
                    break;
                }
                case "p": {
                    toolboxWhere("pixelate");
                    break;
                }
                case "r": {
                    if (e.ctrlKey || e.metaKey || e.shiftKey || e.altKey) {
                        toolboxWhere("hollowRectangle");
                    } else {
                        toolboxWhere("rectangle");
                    }
                    break;
                }
                case "c": {
                    if (e.ctrlKey || e.metaKey || e.shiftKey || e.altKey) {
                        toolboxWhere("hollowCircle");
                    } else {
                        toolboxWhere("circle");
                    }
                    break;
                }
            }
        });

        // Handle mouse down.
        window.addEventListener("mousedown", (e: MouseEvent) => {
            // Establish if the mouse is over something with the toolbox role and if it is return.
            let root = e.target as HTMLElement | null;
            while (root) {
                if (root.dataset.role === "toolbox") return;
                root = root.parentElement;
            }

            // Set the selection start.
            selectionStart = {x: e.clientX, y: e.clientY};
            setSelectionStart(selectionStart);
        });
        
        // Handle mouse up.
        window.addEventListener("mouseup", (e: MouseEvent) => {
            if (!selectionStart) {
                // In this situation, this was not mid way through a selection.
                // We can safely ignore this.
                return;
            }

            if (e.clientX === selectionStart.x && e.clientY === selectionStart.y) {
                // This was a click, not a drag.
                return;
            }

            if (toolboxIndex === 0) {
                // Call the done function.
                done(selectionStart, {x: e.clientX, y: e.clientY});
            } else {
                // Establish the top left/bottom right coordinates.
                const topLeft = {x: Math.min(selectionStart.x, e.clientX), y: Math.min(selectionStart.y, e.clientY)};
                const bottomRight = {x: Math.max(selectionStart.x, e.clientX), y: Math.max(selectionStart.y, e.clientY)};

                // Set the selection start to null.
                selectionStart = null;
                setSelectionStart(null);

                // Call the editor function.
                const payload: EditorDone = {
                    editorId: toolboxItems[toolboxIndex].id,
                    height: bottomRight.y - topLeft.y,
                    width: bottomRight.x - topLeft.x,
                    relativeLeft: topLeft.x,
                    relativeTop: topLeft.y,
                    rgb,
                };
                ipcRenderer.send(`selector:editor:${window.location.hash.substr(1)}`, payload);
            }
        });

        // Send a listening event.
        ipcRenderer.send(`selector:listening:${window.location.hash.substr(1)}`);
    }, []);

    // Handle if there is no background.
    if (!imageUrl) {
        // Return a blank span here.
        return <span />;
    }

    // Return the main structure.
    return <div style={{
        position: "fixed", width: "100%", height: "100%", zIndex: -9999,
        backgroundImage: `linear-gradient(rgba(0, 0, 0, 0.5), rgba(0, 0, 0, 0.5)), url(${imageUrl})`,
        backgroundSize: "cover",
    }}>
        <Toolbox notch={notch} cursorPos={cursorPos} toolboxItems={toolboxItems} toolboxIndex={toolboxIndex} rgb={rgb} />
        <Crosshair cursorPos={cursorPos} />
        <Magnifier cursorPos={cursorPos} imageUrl={imageUrl} displayBounds={displayBounds!} scale={scale} />
        <SelectedRegion selectionStart={selectionStart} imageUrl={imageUrl} cursorPos={cursorPos!} scale={scale} />
        <EditedRegions editorsPtr={editors} />
        <Tooltip tooltip={tooltip} />
    </div>;
};
