import { JSONValue } from "../../sharedTypes";
import * as uncachedApi from "./main_api";
import { Mutex } from "async-mutex";

const cachedConfigMu = new Mutex();

let cachedConfig: {[key: string]: JSONValue};

export const getConfig = async () => {
    const unlocker = await cachedConfigMu.acquire();
    try {
        if (cachedConfig) return cachedConfig;
        const c = await uncachedApi.getConfig();
        cachedConfig = c;
        return c;
    } finally {
        unlocker();
    }
};

export const writeConfig = async (changes: {[key: string]: JSONValue | undefined}) => {
    const unlocker = await cachedConfigMu.acquire();
    try {
        await uncachedApi.writeConfig(changes);
        if (cachedConfig) {
            // We should mutate the local cache to set these changes.
            for (const key in changes) {
                const val = changes[key];
                if (val === undefined) delete cachedConfig[key];
                else cachedConfig[key] = val;
            }
        }
    } finally {
        unlocker();
    }
};
