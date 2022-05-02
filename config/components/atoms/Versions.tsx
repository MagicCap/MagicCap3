import React from "react";
import { getCommits } from "../../utils/main_api";

export default () => {
    // Handle getting the commits object.
    const [commits, setCommits] = React.useState<{[moduleName: string]: string}>({});
    React.useEffect(() => {
        getCommits().then(setCommits);
    }, []);

    // Defines the various items.
    const items = [
        ["Configuration", "config"],
        ["Main", "main"],
        ["Uploaders", "uploaders_kernel"],
        ["Editors", "editors"],
        ["Selector", "selector"]
    ];

    // Make all the parts.
    return <p>
        {items.map((x, i) => <React.Fragment key={i}><b>{x[0]} Commit:</b> {commits[x[1]] || ""}<br /></React.Fragment>)}
    </p>;
};
