import React from "react";
import AceEditor from "react-ace";
import Button from "./Button";
import Modal from "./Modal";
import { getCommits, getConfig, getSecretConfigKeys, databaseQuery } from "../../utils/main_api";
import save from "../../utils/save";
import read from "../../utils/read";
import { insert } from "../../utils/query_builder";
import { writeConfig } from "../../utils/api_cache";

type ConfigViewProps = {
    hide: () => void;
    goToCaptures: () => void;
};

const generateConfigInformation = async (userReadable: boolean) => {
    const config = await getConfig();
    const secrets = await getSecretConfigKeys();
    const commits = await getCommits();

    if (userReadable) {
        // Return a string to the user.
        const keys = Object.keys(config).sort();
        let data = `===
Commits
===
Config Commit: ${commits.config.trim()}
Main Commit: ${commits.main.trim()}
Uploaders Commit: ${commits.uploaders_kernel.trim()}
Editors Commit: ${commits.editors.trim()}
Selectors Commit: ${commits.selector.trim()}
===
Configuration Options
===
`;
        for (const key of keys) {
            data += `${key} = ${secrets.includes(key) ? "<HIDDEN>" : config[key]}
`;
        }
        return data;
    }

    // Return the machine readable config.
    const captures = await databaseQuery("SELECT * FROM captures ORDER BY timestamp DESC");
    return {config, commits, captures};
};

const validateType = (x: any, label: string, t: "" | 0, nullable: boolean) => {
    switch (t) {
        case "":
            if (typeof x !== "string") {
                if (!nullable || x !== null) throw new Error("Type of " + label + " is not a string");
            }
            return x;
        case 0:
            if (typeof x !== "number") {
                if (!nullable || x !== null) throw new Error("Type of " + label + " is not a number");
            }
            return x;
    }
};

const loadJson = (goToCaptures: () => void) => {
    read([".json", "application/json"], async content => {
        // Decode the JSON.
        const d = JSON.parse(content);

        try {
            // Check this is a object.
            if (typeof d !== "object" || Array.isArray(d)) {
                throw new Error("Config file is not an object");
            }

            // Handle loading in captures.
            const captures = d.captures;
            if (captures) {
                // Make sure this is an array.
                if (!Array.isArray(captures)) {
                    throw new Error("Captures is not an array");
                }

                // Go through each capture.
                for (const capture of captures) {
                    // Check this is a object.
                    if (typeof capture !== "object" || Array.isArray(capture)) {
                        throw new Error("Capture is not an object");
                    }

                    // Create the blob.
                    const blob = {
                        filename: validateType(capture.filename, "filename", "", false),
                        success: capture.success ? 1 : 0,
                        timestamp: validateType(capture.timestamp, "timestamp", 0, false),
                        url: validateType(capture.url, "url", "", true),
                        file_path: validateType(capture.file_path, "file_path", "", true),
                    };
                    try {
                        await insert("captures", blob);
                    } catch (_) {
                        // Unique constraint failed. Ignore this.
                    }
                }
            }

            // Handle loading the config.
            const config = d.config;
            if (config) {
                // Make sure the config is an object.
                if (typeof config !== "object" || Array.isArray(config)) {
                    throw new Error("Config is not a object");
                }

                // Write the config.
                await writeConfig(config);

                // Go to the captures.
                goToCaptures();
            }
        } catch (e) {
            // Something went wrong during the loading of the config.
        }
    });
};

const saveJson = () => {
    generateConfigInformation(false).then((x: any) => {
        const j = JSON.stringify(x);
        save("config.json", j);
    });
};

export default ({hide, goToCaptures}: ConfigViewProps) => {
    const [userConfig, setUserConfig] = React.useState("Loading...");
    React.useEffect(() => {
        generateConfigInformation(true).then(x => setUserConfig(x as string));
    }, []);

    return <Modal onClose={hide} title="View Configuration">
        <p>
            Below is text debug information that you can share. Tokens and other sensitive data is automatically redacted.
             <b>Note that the JSON save will contain sensitive data and should not be shared.</b>
        </p>
        <AceEditor
            value={userConfig}
            readOnly={true}
            theme="github"
            style={{
                width: "100%",
                height: "40vh",
                marginBottom: "20px",
            }}
        />
        <p>
            <Button alt="Load Configuration JSON" color="#404040" onClick={() => loadJson(goToCaptures)} whiteText={true}>
                Load Configuration JSON
            </Button>
            <Button alt="Save Configuration JSON" color="#404040" onClick={() => saveJson()} whiteText={true}>
                Save Configuration JSON
            </Button>
        </p>
    </Modal>;
};
