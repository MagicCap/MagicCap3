import React from "react";
import BottomBar from "./atoms/BottomBar";
import Captures from "./Captures";
import Uploaders from "./Uploaders";
import FileSaving from "./FileSaving";
import Hotkeys from "./Hotkeys";
import General from "./General";

export default () => {
    // Defines the index of the currently selected item.
    const [currentlySelected, setCurrentlySelected] = React.useState(0);

    // Defines the components.
    const components = [
        Captures, Uploaders, FileSaving,
        Hotkeys, General,
    ];

    // Get the displayed component.
    const DisplayedComponent = components[currentlySelected];

    // Return the div with everything in.
    return <div style={{display: "flex", height: "100vh", flexDirection: "column"}}>
        <div style={{flexGrow: 1, overflowY: "scroll"}}>
            <DisplayedComponent setCurrentlySelected={setCurrentlySelected} />
        </div>

        <BottomBar
            currentlySelected={currentlySelected}
            setCurrentlySelected={setCurrentlySelected}
        />
    </div>;
};
