import React from "react";
import { getConfig, writeConfig } from "../../utils/api_cache";

type ConfigBitwiseProps = {
    configKey: string;
    description: string;
    bitmask: number;
    defaultValue: number;
};

export default ({configKey, description, bitmask, defaultValue}: ConfigBitwiseProps) => {
    // Defines if the box is checked.
    const [checked, setChecked] = React.useState((defaultValue & bitmask) === bitmask);

    // Get the configuration and state for this checkbox.
    React.useEffect(() => {
        (async() => {
            // Get the config from either main or the cache.
            const config = await getConfig();

            // Set the result.
            if (config[configKey] === undefined) return;
            setChecked(((config[configKey] as number) & bitmask) === bitmask);
        })();
    }, []);

    // Return the checkbox.
    return <div style={{margin: "10px", marginLeft: 0}}>
        <label>
            <input name={description} type="checkbox" checked={checked} onChange={async () => {
                setChecked(!checked);
                const conf = await getConfig();
                let result = conf[configKey] === undefined ? defaultValue : conf[configKey] as number;
                if (!checked) {
                    // Use twos complement to set it to true.
                    result |= bitmask;
                } else {
                    // Use ones complement to set it to false.
                    result &= ~bitmask;
                }
                const o: any = {};
                o[configKey] = result;
                writeConfig(o);
            }} />
                {description}
        </label>
    </div>;
};
