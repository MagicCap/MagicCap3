import React from "react";
import { Pointer } from "../utils/pointer";

type EditedRegionsProps = {
    editorsPtr: Pointer<{top: number; left: number; width: number; height: number; imgUrl: string}[]>
};

export default ({editorsPtr}: EditedRegionsProps) => {
    // Resolve the editors pointer.
    const editors = editorsPtr.to;

    // Return the items.
    return <>{editors.map((x, i) => <span style={{
        position: "fixed", zIndex: 1, left: x.left, top: x.top, backgroundSize: "cover",
        width: x.width, height: x.height, backgroundImage: `url(${x.imgUrl})`
    }} key={i} />)}</>;
};
