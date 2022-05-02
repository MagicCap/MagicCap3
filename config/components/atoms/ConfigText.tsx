import React from "react";
import styled from "styled-components";
import { getConfig, writeConfig } from "../../utils/api_cache";

const ErrorMessage = styled.p`
    font-size: 10px;
    color: red;
`;

const TextInput = styled.input`
    width: 40%;
    font-size: 15px;
`;

type ConfigTextProps = {
    configKey: string;
    name: string;
    defaultText: string | undefined;
    nullable: boolean;
    password: boolean;
    validator?: (s: string) => void;
};

export default ({configKey, name, defaultText, nullable, password, validator}: ConfigTextProps) => {
    // Defines the current value.
    const [currentValue, setCurrentValue] = React.useState("");

    // Defines the current save error.
    const [saveError, setSaveError] = React.useState("");

    // Get the configuration and state for this checkbox.
    React.useEffect(() => {
        (async() => {
            // Get the config from either main or the cache.
            const config = await getConfig();

            // Set the result.
            if (config[configKey] === undefined) {
                if (defaultText !== undefined) setCurrentValue(defaultText);
            } else {
                setCurrentValue(config[configKey] as string);
            }
        })();
    }, []);

    // Return the checkbox.
    return <div style={{margin: "10px", marginLeft: 0}}>
        {
            saveError !== "" ? <ErrorMessage>{saveError}</ErrorMessage> : null
        }
        <label>
            {name}:<span style={{marginRight: "10px"}} />
            <TextInput name={name} type={password ? "password" : "text"} value={currentValue} onChange={e => {
                // Set the current value state.
                setCurrentValue(e.target.value);

                // Check if it's a blank string.
                if (e.target.value === "") {
                    if (nullable) {
                        // Write undefined to the config.
                        const o: any = {};
                        o[configKey] = undefined;
                        writeConfig(o);
                    } else {
                        // Return a error.
                        setSaveError("Value cannot be null.");
                        return;
                    }
                }

                // Try to validate the string.
                try {
                    if (validator) validator(e.target.value);
                } catch (e: any) {
                    const msg = e.message !== undefined ? e.message : e;
                    setSaveError(msg);
                }

                // Write the config.
                const o: any = {};
                o[configKey] = e.target.value;
                writeConfig(o);
                setSaveError("");
            }} />
        </label>
    </div>;
};
