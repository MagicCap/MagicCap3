import { JSONValue, RequestPacket, JSONableUploaderDetails, OAuthClientInformation } from "../../sharedTypes";

declare global {
    const mainRequest: (data: RequestPacket) => Promise<any>;
    const onOAuth2: (id: string, cb: (err: string | null, result: string) => void) => () => void;
}

export const getConfig = (): Promise<{[key: string]: JSONValue}> => {
    return mainRequest({type: "getConfig", data: null});
};

export const writeConfig = async (changes: {[key: string]: JSONValue | undefined}): Promise<void> => {
    const o: any = {};
    for (const key in changes) {
        if (changes[key] !== undefined) o[key] = changes[key];
    }
    await mainRequest({type: "writeConfig", data: {
        rem: Object.keys(changes).filter(x => changes[x] === undefined),
        set: o
    }});
};

export const getUploaders = (): Promise<{[id: string]: JSONableUploaderDetails}> => {
    return mainRequest({type: "getUploaders", data: null});
};

export const testUploader = async (id: string): Promise<void> => {
    await mainRequest({type: "testUploader", data: id});
};

export const databaseQuery = (query: string, ...data: JSONValue[]): Promise<{[key: string]: JSONValue}[]> => {
    return mainRequest({type: "databaseQuery", data: [query, data]});
};

export const databaseExec = (query: string, ...data: JSONValue[]): Promise<void> => {
    return mainRequest({type: "databaseExec", data: [query, data]});
};

export const validatedFileRemoval = (filePath: string, timestamp: number): Promise<void> => {
    return mainRequest({type: "validatedFileRemoval", data: [filePath, timestamp]});
};

export const validatedFileOpen = (filePath: string, timestamp: number): Promise<void> => {
    return mainRequest({type: "validatedFileOpen", data: [filePath, timestamp]});
};

export const validatedFolderOpen = (filePath: string, timestamp: number): Promise<void> => {
    return mainRequest({type: "validatedFolderOpen", data: [filePath, timestamp]});
};

export const validatedUrlOpen = (url: string, timestamp: number): Promise<void> => {
    return mainRequest({type: "validatedUrlOpen", data: [url, timestamp]});
};

export const defaultFilePath = (): Promise<string> => {
    return mainRequest({type: "defaultFilePath", data: null});
};

export const openFolder = (): Promise<string | null> => {
    return mainRequest({type: "openFolder", data: null}); 
};

export const waitForHotkey = (): Promise<void> => {
    return mainRequest({type: "waitForHotkey", data: null}); 
};

export const unwaitForHotkey = (): Promise<void> => {
    return mainRequest({type: "unwaitForHotkey", data: null}); 
};

export const getCommits = (): Promise<{[moduleName: string]: string}> => {
    return mainRequest({type: "getCommits", data: null});
};

export const destroyConfig = (includeCaptures: boolean): Promise<void> => {
    return mainRequest({type: "destroyConfig", data: includeCaptures});
};

export const getSecretConfigKeys = (): Promise<string[]> => {
    return mainRequest({type: "getSecretConfigKeys", data: null});
};

const killers: {[id: string]: () => void} = {};

export const openOAuth2Flow = async (
    uploaderId: string, optionKey: string, option: OAuthClientInformation,
    cb: (err: string | null, result: string) => Promise<void>
): Promise<string> => {
    const flowId = await mainRequest({type: "openOAuth2Flow", data: [uploaderId, optionKey, option]});
    killers[flowId] = onOAuth2(flowId, (err, result) => {
        killers[flowId]();
        delete killers[flowId];
        cb(err, result);
    });
    return flowId;
};

export const cancelOAuth2Flow = (id: string) => {
    if (killers[id]) {
        killers[id]();
        delete killers[id];
    }
    return mainRequest({type: "cancelOAuth2Flow", data: id}); 
};
