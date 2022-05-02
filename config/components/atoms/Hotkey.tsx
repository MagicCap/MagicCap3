import React from "react";
import { Input } from "electron";
import { JSONValue } from "../../../sharedTypes";
import { getConfig, writeConfig } from "../../utils/api_cache";
import Button from "./Button";
import { unwaitForHotkey, waitForHotkey } from "../../utils/main_api";

declare global {
    const onHotkey: (f: (ev: Input) => any) => () => void;
}

let hotkeyOpen = false;

type HotkeySetterProps = {
    onUpdate: (val: string | null) => void;
};

const mkHotkey = (modifiers: string[], key: string): string => {
    // Remove "left" and "right" from modifiers.
    modifiers = modifiers.filter(x => x !== "left" && x !== "right");

    // Capitalize the modifiers and key.
    key = key.replace(/^\w/, c => c.toUpperCase());
    modifiers = modifiers.map(x => x.replace(/^\w/, c => c.toUpperCase()));

    // Check if the modifiers contain the key.
    let modsJoined = modifiers.join("+");
    for (const mod of modifiers) {
        if (mod === key) return modsJoined;
    }

    // If the key string is blank, return the modifiers.
    if (key === "") return modsJoined;

    // Return the full hotkey.
    if (modsJoined !== "") modsJoined += "+";
    return `${modsJoined}${key === "+" ? "Plus" : key}`;
};

const HotkeySetter = ({onUpdate}: HotkeySetterProps) => {
    const [hotkey, setHotkey] = React.useState<string | null>(null);
    const hotkeyLabel = hotkey === null ? "No hotkey set" : hotkey;

    React.useEffect(() => {
        const eventKiller = onHotkey(input => {
            // Create the hotkey from key inputs.
            setHotkey(mkHotkey(input.modifiers, input.key));
        });
        waitForHotkey();
        return () => {
            unwaitForHotkey().then(eventKiller);
        };
    }, []);

    return <p>
        {hotkeyLabel} <Button
            alt="Set Hotkey" color="#404040"
            onClick={() => onUpdate(hotkey)}
            whiteText={true}
        >
            Set Hotkey
        </Button>
    </p>;
};

type HotkeyProps = {
    configKey: string;
    name: string;
};

export default ({configKey, name}: HotkeyProps) => {
    const [hotkey, setHotkey] = React.useState<string | null>(null);
    const changeHotkeyLabel = `${hotkey === null ? "New" : "Update"} Hotkey`;
    const [hotkeyActive, setHotkeyActive] = React.useState(false);

    React.useEffect(() => {
        getConfig().then(config => {
            const val = config[configKey];
            if (val !== undefined) setHotkey(val as string);
        });
    }, []);

    if (hotkeyActive) return <>
        <p>
            <b>{name}:</b>
        </p>
        <HotkeySetter onUpdate={val => {
            setHotkeyActive(false);
            hotkeyOpen = false;
            const o: {[key: string]: JSONValue | undefined} = {};
            o[configKey] = val === null ? undefined : val;
            writeConfig(o).then(() => setHotkey(val));
        }} />
    </>;

    return <>
        <p>
            <b>{name}:</b>
        </p>
        <p>
            {
                hotkey !== null ? hotkey + " " : null
            }
            <Button alt={changeHotkeyLabel} color="#404040" onClick={() => {
                if (hotkeyOpen) return;
                setHotkeyActive(true);
                hotkeyOpen = true;
            }} whiteText={true}>
                {changeHotkeyLabel}
            </Button>
        </p>
    </>;
};
