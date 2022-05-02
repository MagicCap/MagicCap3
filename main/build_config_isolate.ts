import { Uploader, UploaderOption } from "../sharedTypes";
import database from "./database";

export default (uploader: Uploader): Map<string, any> => {
    const configIsolate: Map<string, any> = new Map();
    let scanOptions: (options: UploaderOption[]) => void;
    scanOptions = (options: UploaderOption[]): void => {
        for (const option of options) {
            // Get from the database.
            let value = database.getConfig(option.key);
    
            // Handle if it does not exist in the database.
            if (value === undefined) {
                // Check if it has a default.
                if (option.default) {
                    // Set the config option to the default option.
                    value = option.default;
                } else if (option.required) {
                    // This means something went wrong.
                    throw new Error("Required configuration option for uploader is not set.");
                }
            }
    
            // Handle the children of this option if it is a enum.
            if (option.type === "enum" && option.conditional) {
                const sub = option.conditional[option.options[value as number]];
                if (sub) scanOptions(sub);
            }
    
            // If it does, just freely set it.
            else configIsolate.set(option.key, value);
        }
    };
    scanOptions(uploader.options);
    return configIsolate;
};
