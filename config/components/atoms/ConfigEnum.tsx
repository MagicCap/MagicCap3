import React from "react";
import { JSONValue, UploaderOption } from "../../../sharedTypes";
import { getConfig, writeConfig } from "../../utils/api_cache";

type ConfigEnumProps = {
    configKey: string;
    defaultIndex?: number;
    options: string[];
    conditional?: {
        options?: {[option: string]: UploaderOption[]};
        renderer: (option: UploaderOption, index: number | string) => JSX.Element;
    };
};

export default ({configKey, defaultIndex, options, conditional}: ConfigEnumProps) => {
    // Make sure the index isn't undefined.
    if (defaultIndex === undefined) defaultIndex = 0;

    // Defines the index.
    const [index, setIndex] = React.useState(defaultIndex);

    // Load the index from the config if it's there.
    React.useEffect(() => {
        getConfig().then(config => {
            const val = config[configKey];
            if (val !== undefined) setIndex(val as number);
        });
    }, []);

    // Defines any additional options to be renderered.
    let toRender: JSX.Element[] = [];
    if (conditional && conditional.options) {
        const selectedOption = conditional.options[options[index]];
        if (selectedOption) toRender = selectedOption.map((x, i) => {
            return conditional.renderer(x, `${configKey}_${i}`);
        });
    }

    // Return the radio buttons and any additional content that needs to be renderered.
    return <>
        <div>
            {
                options.map((option, optionIndex) => <div key={optionIndex}>
                    <input
                        type="radio"
                        value={`${optionIndex}`}
                        name={configKey}
                        checked={index === optionIndex}
                        onChange={e => {
                            if (!e.target.checked) return;
                            setIndex(optionIndex);
                            const o: {[key: string]: JSONValue | undefined} = {};
                            o[configKey] = optionIndex;
                            writeConfig(o);
                        }}
                    />
                    {option}
                </div>)
            }
        </div>
        {toRender}
    </>;
};
