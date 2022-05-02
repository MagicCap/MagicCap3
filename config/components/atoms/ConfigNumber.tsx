import React from "react";
import styled from "styled-components";
import { getConfig, writeConfig } from "../../utils/api_cache";

const ErrorMessage = styled.p`
    font-size: 10px;
    color: red;
`;

type ConfigNumberProps = {
    configKey: string;
    name: string;
    defaultNumber: number | undefined;
    nullable: boolean;
    unsigned: boolean;
    min: number | undefined;
    max: number | undefined;
};

export default ({configKey, name, defaultNumber, nullable, unsigned, min, max}: ConfigNumberProps) => {
    // Defines the current value.
    const [currentValue, setCurrentValue] = React.useState(min);

    // Defines the current save error.
    const [saveError, setSaveError] = React.useState("");

    // Get the configuration and state for this checkbox.
    React.useEffect(() => {
        (async() => {
            // Get the config from either main or the cache.
            const config = await getConfig();

            // Set the result.
            if (config[configKey] === undefined) {
                if (defaultNumber !== undefined) setCurrentValue(defaultNumber);
            } else {
                setCurrentValue(config[configKey] as number);
            }
        })();
    }, []);

    // Get the min attribute.
    const minAttr = min === undefined ? (unsigned ? 0 : undefined) : min;

    // Return the checkbox.
    return <div style={{margin: "10px", marginLeft: 0}}>
        {
            saveError !== "" ? <ErrorMessage>{saveError}</ErrorMessage> : null
        }
        <label>
            {name}:<span style={{marginRight: "10px"}} />
            <input name={name} type="number" value={currentValue} min={minAttr} max={max} onChange={e => {
                // Set the current value state.
                setCurrentValue(isNaN(e.target.valueAsNumber) ? minAttr : e.target.valueAsNumber);

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

                // Write the config.
                const o: any = {};
                o[configKey] = e.target.value;
                writeConfig(o);
                setSaveError("");
            }} />
        </label>
    </div>;
};
