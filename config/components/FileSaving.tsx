import React from "react";
import { getConfig, writeConfig } from "../utils/api_cache";
import { defaultFilePath, openFolder } from "../utils/main_api";
import Button from "./atoms/Button";
import ConfigCheckbox from "./atoms/ConfigCheckbox";
import ConfigText from "./atoms/ConfigText";
import Container from "./atoms/Container";

export default () => {
    const [filePath, setFilePath] = React.useState("");

    React.useEffect(() => {
        getConfig().then(config => {
            const filePath = config.save_path;
            if (filePath === undefined) {
                // Get the default file path.
                defaultFilePath().then(setFilePath);
            } else {
                // Set the file path.
                setFilePath(filePath as string);
            }
        });
    }, []);

    return <Container>
        <h1>File Saving Configuration</h1>

        <ConfigCheckbox
            configKey="save_capture"
            defaultBehaviour={true}
            description="Save the capture when it is finished."
        />

        <h2>Save Path</h2>

        <p>
            {filePath}
        </p>
        <p>
            <Button alt="Change File Path" color="#404040" onClick={() => {
                openFolder().then(folder => {
                    if (folder === null) return;
                    setFilePath(folder);
                    writeConfig({save_path: folder});
                });
            }} whiteText={true}>
                Change File Path
            </Button>
        </p>

        <h2>Filename Format</h2>

        <ConfigText
            configKey="file_naming_pattern"
            name="Filename Format"
            defaultText="screenshot_%date%_%time%"
            nullable={false}
            password={false}
        />
    </Container>;
};
