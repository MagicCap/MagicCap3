import React from "react";

type TooltipProps = {
    tooltip: {top: number; left: number; text: string} | null
};

export default ({tooltip}: TooltipProps) => {
    if (!tooltip) return <></>;
    return <span style={{
        top: tooltip.top, left: tooltip.left, position: "fixed", zIndex: 100,
        backgroundColor: "black", color: "white", padding: "5px", marginTop: "5px",
        borderRadius: "10%", fontFamily: "Arial"
    }} aria-hidden={true}>
        {tooltip.text}
    </span>;
};
