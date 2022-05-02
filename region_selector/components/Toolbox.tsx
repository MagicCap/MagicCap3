import React from "react";
import spark from "spark-md5";
import { decode } from "base64-arraybuffer";
import { ToolboxItem } from "../../sharedTypes";
import { dispatch } from "../utils/announcement";

type ToolboxProps = {
    notch: number;
    toolboxItems: ToolboxItem[];
    toolboxIndex: number;
    rgb: [number, number, number];
    cursorPos: {x: number; y: number} | null;
};

// NOTE: MD5 is fine for this. It does not need to be cryptographically secure.

const hashMap: Map<string, string> = new Map();

const urlify = (b64: string): string => {
    const decoded = decode(b64);
    const hashed = spark.ArrayBuffer.hash(decoded);
    const key = hashed.toString();
    const cachedUrl = hashMap.get(key);
    if (cachedUrl) return cachedUrl;
    const url = URL.createObjectURL(new Blob([decoded], {type: "image/png"}));
    hashMap.set(key, url);
    return url;
};

export default ({notch, toolboxItems, toolboxIndex, rgb, cursorPos}: ToolboxProps) => {
    // If the length is zero, return a blank component.
    if (toolboxItems.length === 0 || !cursorPos) return <></>;

    // Hexify the rgb values.
    const hexify = rgb.map(x => {
        const hex = x.toString(16);
        return hex.length === 1 ? "0" + hex : hex;
    }).join("");

    // Handle color changes.
    const handleColorChange = (e: any) => {
        const colorHex = (e.target as HTMLInputElement).value.substr(1);
        const r = parseInt(colorHex.substr(0, 2), 16);
        const g = parseInt(colorHex.substr(2, 2), 16);
        const b = parseInt(colorHex.substr(4, 2), 16);
        dispatch("rgb", [r, g, b]);
    };

    // Otherwise return a populated component.
    return <div className="toolbox" data-role="toolbox" style={{marginTop: `${25 + notch}px`}}>
        {toolboxItems.map((x, i) => <span
            key={i} data-tooltip={x.description}
            className={toolboxIndex === i ? "selected" : ""} onClick={() => dispatch("editor_change", i)}
        >
            <img alt={x.description} draggable="false" src={urlify(x.icon)} />
        </span>)}

        <span data-tooltip="Set editor color">
            <input type="color" value={`#${hexify}`} onChange={handleColorChange} />
        </span>
    </div>;
};
