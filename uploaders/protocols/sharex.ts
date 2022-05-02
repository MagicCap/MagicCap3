import xpath from "xpath";
import { DOMParser } from "xmldom";
import XMLBuilder from "xmlbuilder";
import FormData from "form-data";
import { fromBuffer } from "file-type";
import fetch from "node-fetch";

// A basic implementation of JSON path.
const jsonPath = (path: string, jsonBlob: string) => {
    let blob: any = JSON.parse(jsonBlob);
    const pathSplit = path.split(".");
    let lastPath = "$";
    if (!blob) throw new Error("Root is null.");
    if (pathSplit.length === 1 && (pathSplit[0] === "" || pathSplit[0] === "$")) return blob;
    for (;;) {
        const item = pathSplit.shift();
        if (item === undefined) break;
        if (Array.isArray(blob)) {
            // Try a number index.
            const n = Number(item);
            if (isNaN(n)) {
                // In this situation, the path isn't valid because it's an array.
                throw new Error(`${lastPath} is an array, but the key is not a number`);
            }
            const res: any = blob[n];
            if (res === undefined) throw new Error(`${lastPath} is of length ${blob.length}, tried to access ${n}.`);
            if (pathSplit.length !== 0) {
                if (!Array.isArray(res) && typeof res !== "object") throw new Error(`${lastPath} is not a object or array.`);
            }
            lastPath = `${lastPath}.${item}`;
            blob = res;
        } else {
            // Try a string index.
            const res: any = blob[item];
            if (res === undefined) throw new Error(`${item} is undefined on ${lastPath}.`);
            if (pathSplit.length !== 0) {
                if (!Array.isArray(res) && typeof res !== "object") throw new Error(`${lastPath} is not a object or array.`);
            }
            lastPath = item;
            blob = res;
        }
    }
    return blob;
};

interface SXCU {
    // Defines the destination type.
    DestinationType: string | undefined;

    // Defines the request body type.
    Body: string | undefined;

    // The file form name. Needed for form request types.
    FileFormName: string | undefined;

    // Defines the URL to make the request to.
    RequestURL: string;

    // Defines the structure for the response URL.
    URL: string;

    // Defines any headers that should be added.
    Headers: {[key: string]: string} | undefined;

    // Defines a list of regex.
    RegexList: string[] | undefined;

    // Defines the URL parameters.
    Parameters: {[key: string]: string} | undefined;

    // Defines the method of request.
    RequestMethod: string | undefined;
}

const validateSxcu = (sxcuRaw: any): SXCU => {
    // Ensure the result is an object.
    if (typeof sxcuRaw !== "object") throw new Error("SXCU file should be an object.");

    // Handle getting a string key.
    const getString = (key: string, allowUndefined: boolean) => {
        const value = sxcuRaw[key];
        if (typeof value !== "string") {
            if (allowUndefined) return;
            throw new Error(`The key ${key} is expected to be a string.`);
        }
        return value;
    };

    // Handle getting a string > string object.
    const getStringStringObj = (key: string, allowUndefined: boolean): {[key: string]: string} | undefined => {
        const value = sxcuRaw[key];
        if (typeof value !== "object") {
            if (allowUndefined) return;
            throw new Error(`The key ${key} is expected to be a object.`);
        }
        Object.values(value).forEach(x => {
            if (typeof x !== "string") throw new Error(`The key ${key} contains a non-string value in the object.`);
        });
        return value;
    };

    // Handle getting a string array.
    const getStringArray = (key: string, allowUndefined: boolean): string[] | undefined => {
        const value = sxcuRaw[key];
        if (!Array.isArray(value)) {
            if (allowUndefined) return;
            throw new Error(`The key ${key} is expected to be a array.`);
        }
        for (const x of value) {
            if (typeof x !== "string") throw new Error(`The key ${key} contains a non-string value in the object.`);
        }
        return value;
    };

    // Create the SXCU object.
    const sxcu: SXCU = {
        DestinationType: getString("DestinationType", true),
        Body: getString("Body", true),
        FileFormName: getString("FileFormName", true),
        RequestURL: getString("RequestURL", false)!,
        URL: getString("URL", false)!,
        Headers: getStringStringObj("Headers", true),
        RegexList: getStringArray("RegexList", true),
        Parameters: undefined,
        RequestMethod: undefined
    };

    // Handle request method.
    if (sxcuRaw.RequestMethod) sxcu.RequestMethod = getString("RequestMethod", false)!;
    else sxcu.RequestMethod = getString("RequestType", true);

    // Handle parameters.
    if (sxcuRaw.Parameters) sxcu.Parameters = getStringStringObj("Parameters", false)!;
    else sxcu.Parameters = getStringStringObj("Arguments", true);

    // Return the SXCU object.
    return sxcu;
};

// Parse the ShareX string.
const parseShareXString = (
    s: string, responseBody: string | undefined,
    responseUrl: string | undefined, filename: string | undefined,
    headers: {[key: string]: string} | undefined, regexList: string[]
): string => {
    // Defines the regex to scan a SXCU item for special flags.
    const paramRegex = /((?<![\\])\$)((?:.(?!(?<![\\])\1))*.?)\1/;

    // Defines the final string.
    let final = "";

    // Keep going until all params are handled.
    for (let match = s.match(paramRegex); match !== null; match = s.match(paramRegex)) {
        // If there isn't content before this match, Handle trimming it.
        final += s.substring(0, match.index || 0);
        s = s.substring(match.index || 0);

        // Handle the param structure.
        const innerParam = match[2];
        switch (innerParam) {
        case "response":
            final += (responseBody === undefined ? "" : responseBody);
            break;
        case "responseurl":
        case "input":
            if (responseUrl === undefined) throw new Error("Response URL is not set.");
            final += responseUrl;
            break;
        case "filename":
            if (filename === undefined) throw new Error("Filename is not set.");
            final += filename;
            break;
        default:
            // Handle prompt:
            if (innerParam.startsWith("prompt:")) {
                // Compatibility! Do nothing.
            }

            // Handle header:
            else if (innerParam.startsWith("header:")) {
                // Handle checking headers.
                if (headers === undefined) throw new Error("Headers are not set.");
                const header = headers[innerParam.substring(7)];
                if (header !== undefined) final += header;
            }

            // Handle json:
            else if (innerParam.startsWith("json:")) {
                if (responseBody === undefined) throw new Error("No response body.");
                const result = `${jsonPath(innerParam.substring(5), responseBody)}`;
                final += result.toString();
            }

            // Handle xml:
            else if (innerParam.startsWith("xml:")) {
                if (responseBody === undefined) throw new Error("No response body.");
                const path = innerParam.substring(4);
                const b = new DOMParser().parseFromString(responseBody);
                const r = xpath.select(path, b);
                final += (!r || r.length === 0) ? "" : r[0].toString();
            }

            // Handle base64:
            else if (innerParam.startsWith("base64:")) {
                if (responseBody === undefined) throw new Error("No response body.");
                final += atob(innerParam.substring(7));
            }

            // Handle regex:
            else if (innerParam.startsWith("regex:")) {
                const s = innerParam.substring(6).split("|");
                const regexString = regexList[Number(s[0])];
                if (!regexString) throw new Error(`Regex at index ${s[0]} not found.`);
                const reParse = RegExp(regexString);
                if (responseBody === undefined) throw new Error("No response body.");
                const m = responseBody.match(reParse);
                if (!m) throw new Error("Response body did not match regex.");
                const n = Number(s[1]);
                let g: any = "";
                if (isNaN(n)) g = m[s[1] as any];
                else g = m[n];
                final += g.toString();
            }

            // Handle select:
            else if (innerParam.startsWith("select:")) final += innerParam.substring(7).split("|")[0];

            // Handle random:
            else if (innerParam.startsWith("random:")) {
                const s = innerParam.substring(7).split("|");
                final += s[Math.random() * s.length];
            }

            // Unknown function
            else throw new Error(`Unknown function: ${innerParam}`);
        }

        // Handle trimming this part off.
        s = s.substring(match[0].length);
    }

    // Add any remainder to the string.
    final += s;

    // Return the final string.
    return final;
};

const isSupported = (ext: string, destinationTypes: string[]): boolean => {
    if (destinationTypes.includes("fileuploader")) {
        // This is its own case because it is so likely. If this happens, return true here.
        return true;
    }

    for (const type of destinationTypes) {
        if (type === "imageuploader") {
            // Check the file type is supported.
            if (["png", "jpeg", "jpg", "gif", "tiff"].includes(ext)) return true;
        } else if (type === "textuploader" && (ext == "txt" || ext == "md")) {
            // In this case, this is valid.
            return true;
        }
    }

    // No support :(
    return false;
};

const shareXParsedFor = (sxcu: SXCU, filename: string, o: {[key: string]: string}, f: (key: string, value: string) => void) => {
    Object.keys(o).forEach(key => {
        // Parse the key.
        const parsedKey = parseShareXString(key, undefined, undefined, filename, sxcu.Headers, sxcu.RegexList || []);

        // Parse the value.
        const v = parseShareXString(o[key], undefined, undefined, filename, sxcu.Headers, sxcu.RegexList || []);

        // Call the function.
        f(parsedKey, v);
    });
};

export default async (body: Buffer, filename: string, sxcuRaw: any): Promise<string> => {
    // Get the validated SXCU.
    const sxcu = validateSxcu(sxcuRaw);

    // Get the request method.
    const requestMethod = sxcu.RequestMethod ? sxcu.RequestMethod : "POST";

    // Check the destination type.
    const destinationType = sxcu.DestinationType ? sxcu.DestinationType : "ImageUploader, TextUploader, FileUploader";

    // Get the extension.
    const ext = filename.split(".").pop()!.toLowerCase();

    // Make sure the extension is supported.
    if (!isSupported(ext, destinationType.split(",").map(x => x.toLowerCase().trim()))) throw new Error("Uploader does not support destination for filetype.");

    // Create the request URL.
    const requestUrl = parseShareXString(sxcu.RequestURL, undefined, undefined, filename, sxcu.Headers, sxcu.RegexList || []);

    // Go through the parameters.
    const urlParsed = new URL(requestUrl);
    shareXParsedFor(sxcu, filename, sxcu.Parameters || {}, (key, value) => {
        urlParsed.searchParams.append(key, value);
    });

    // Go through the headers.
    const headers: {[key: string]: string} = {};
    shareXParsedFor(sxcu, filename, sxcu.Headers || {}, (key, value) => {
        headers[key] = value;
    });

    // Process the body.
    switch (sxcu.Body) {
    case "FormURLEncoded": {
        if (!sxcu.FileFormName) throw new Error("Unknown file form name.");
        body = Buffer.from(`${encodeURIComponent(sxcu.FileFormName)}=${encodeURIComponent(body.toString("binary"))}`);
        headers["Content-Type"] = "application/x-www-form-urlencoded";
        break;
    }
    case "JSON": {
        // Check the file form name.
        if (!sxcu.FileFormName) throw new Error("Unknown file form name.");

        // Create the body.
        const o: {[key: string]: string} = {};
        o[sxcu.FileFormName] = body.toString("base64");
        body = Buffer.from(JSON.stringify(o));
        headers["Content-Type"] = "application/json";
        break;
    }
    case "XML": {
        // Check the file form name.
        if (!sxcu.FileFormName) throw new Error("Unknown file form name.");

        // Create the body.
        const doc = XMLBuilder.create(sxcu.FileFormName);
        doc.txt(body.toString("base64"));
        body = Buffer.from(doc.toString());
        headers["Content-Type"] = "application/xml";
        break;
    }
    case "Binary": {
        // Do absolutely nothing. In this situation, we should just send the raw data.
        headers["Content-Type"] = "application/octet-stream";
        break;
    }
    default: {
        // In this case, we should assume multipart/form-data.
        if (!sxcu.FileFormName) throw new Error("Unknown file form name.");
        const form = new FormData();
        form.append(sxcu.FileFormName, body, {
            contentType: ((await fromBuffer(body)) || {mime: "application/octet-stream"}).mime,
            filename
        });
        body = form.getBuffer();
        const formHeaders = form.getHeaders();
        for (const key in formHeaders) headers[key] = formHeaders[key];
        break;
    }
    }

    // Create the request.
    const res = await fetch(requestUrl, {
        body, headers, method: requestMethod
    });
    if (!res.ok) throw new Error(`Request returned status code ${res.status}.`);

    // Return the status.
    const replyHeaders: {[key: string]: string} = {};
    res.headers.forEach((value, name) => {
        replyHeaders[name] = value;
    });
    return parseShareXString(sxcu.URL, await res.text(), res.url, filename, replyHeaders, sxcu.RegexList || []);
};
