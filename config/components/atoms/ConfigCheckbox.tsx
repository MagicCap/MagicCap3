import React from "react";
import { getConfig, writeConfig } from "../../utils/api_cache";

type ConfigCheckboxProps = {
    configKey: string;
    description: string;
    defaultBehaviour: boolean;
    callback?: (checked: boolean) => void;
};

export default ({configKey, description, defaultBehaviour, callback}: ConfigCheckboxProps) => {
    // Defines if the box is checked.
    const [checked, setChecked] = React.useState(defaultBehaviour);

    // Get the configuration and state for this checkbox.
    React.useEffect(() => {
        (async() => {
            // Get the config from either main or the cache.
            const config = await getConfig();

            // Set the result.
            if (config[configKey] === undefined) return;
            setChecked(Boolean(config[configKey]));
        })();
    }, []);

    // Return the checkbox.
    return <div style={{margin: "10px", marginLeft: 0}}>
        <label>
            <input name={description} type="checkbox" checked={checked} onChange={() => {
                setChecked(!checked);
                const o: any = {};
                o[configKey] = !checked;
                writeConfig(o);
                if (callback) callback(!checked);
            }} />
                {description}
        </label>
    </div>;
};
