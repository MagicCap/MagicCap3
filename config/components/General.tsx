import React from "react";
import { destroyConfig } from "../utils/main_api";
import Button from "./atoms/Button";
import ConfigBitwise from "./atoms/ConfigBitwise";
import ConfigCheckbox from "./atoms/ConfigCheckbox";
import ConfigEnum from "./atoms/ConfigEnum";
import Container from "./atoms/Container";
import Modal from "./atoms/Modal";
import Versions from "./atoms/Versions";
import ConfigView from "./atoms/ConfigView";

type GeneralProps = {
    setCurrentlySelected: (i: number) => void;
};

export default ({setCurrentlySelected}: GeneralProps) => {
    const [showDeletePrompt, setShowDeletePrompt] = React.useState(false);
    const [includeCaptures, setIncludeCaptures] = React.useState(false);
    const [viewConfig, setViewConfig] = React.useState(false);
    const [dangerRepeatText, setDangerRepeatText] = React.useState("");

    const resetPrompt = () => {
        setShowDeletePrompt(false);
        setIncludeCaptures(false);
        setDangerRepeatText("");
    };

    const toggleIncludeCaptures = () => {
        setIncludeCaptures(!includeCaptures);
        setDangerRepeatText("");
    };

    const doDestroy = () => {
        setShowDeletePrompt(false);
        destroyConfig(includeCaptures);
    };

    return <Container>
        <h1>General Configuration</h1>

        <ConfigCheckbox
            configKey="open_login"
            description="Open MagicCap at login"
            defaultBehaviour={false}
        />

        <h2>Application Information</h2>

        <Versions />

        {
            showDeletePrompt ? <Modal
                title="Reset Settings"
                onClose={resetPrompt}
            >
                <p>Are you sure you want to reset all settings? <b>This will irrecoverably destroy data. You can choose to delete captures too.</b> This will cause the configuration to close.</p>
                <input type="checkbox" checked={includeCaptures} onChange={toggleIncludeCaptures} />
                <label>Delete Captures</label>
                {
                    dangerRepeatText !== `I want to delete all settings${includeCaptures ? " and captures" : ""}` ? <>
                        <p>
                            Type <code>I want to delete all settings{includeCaptures ? " and captures" : ""}</code> below to continue.
                        </p>
                        <input type="text" value={dangerRepeatText} onChange={e => setDangerRepeatText(e.target.value)} style={{width: "100%"}} />
                    </> : <p>
                        <Button alt="Confirm" whiteText={true} color="#a82828" onClick={doDestroy}>
                            Confirm
                        </Button>
                    </p>
                }
            </Modal> : null
        }

        {viewConfig ? <ConfigView hide={() => setViewConfig(false)} goToCaptures={() => setCurrentlySelected(0)} /> : null}

        <p>
            <Button alt="View Config" onClick={() => setViewConfig(true)} color="#1670C4" whiteText={true}>
                View Config
            </Button> 
            <Button alt="Reset Config" whiteText={true} color="#a82828" onClick={() => setShowDeletePrompt(true)}>
                Reset Config
            </Button>
        </p>

        <h2>Clipboard Action</h2>
        <p>Sets the clipboard action that will happen after capture.</p>
        <ConfigEnum
            configKey="clipboard_action"
            defaultIndex={2}
            options={[
                "Do nothing",
                "Write the image to the clipboard",
                "Write the URL to the clipboard"
            ]}
        />

        <h2>Autoupdate</h2>
        <p>
            Sets how autoupdate will behave. Note that on Linux, most 
            updates are done through your package manager and this only
            affects uploader and editor hotfixes that do not require a
            update to core.
        </p>
        <ConfigBitwise
            configKey="update_bits"
            bitmask={1}
            defaultValue={0}
            description="Automatically perform updates to MagicCap"
        />
        <ConfigBitwise
            configKey="update_bits"
            bitmask={2}
            defaultValue={0}
            description="Install alpha updates if they exist"
        />
        <ConfigBitwise
            configKey="update_bits"
            bitmask={4}
            defaultValue={0}
            description="Install beta updates if they exist"
        />
    </Container>;
};
