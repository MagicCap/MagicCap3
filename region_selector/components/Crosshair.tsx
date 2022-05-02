import React from "react";

type CrosshairProps = {
    cursorPos: {x: number; y: number} | null;
};

export default ({cursorPos}: CrosshairProps) => {
    // If there's no cursor position, it's not on this screen.
    if (!cursorPos) return <></>;

    // Handle the bars.
    return <>
        <span style={{position: "fixed", left: cursorPos.x, height: "100%", borderLeft: "1px solid white", zIndex: 10}} data-role="crosshair" />
        <span style={{position: "fixed", top: cursorPos.y, width: "100%",  borderTop: "1px solid white", zIndex: 10}} data-role="crosshair" />
    </>;
};
