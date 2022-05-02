import { fromBuffer } from "file-type";
import FormData from "form-data";
import fetch from "node-fetch";
import { configSubstrings } from "../utils";
import { Category } from "../../sharedTypes";

export default async (
    url: string, method: string,
    postAs: {type: "b64" | "multipart" | "urlencoded", key: string} | {type: "raw"},
    headers: {[map: string]: string} | undefined,
    config: Map<string, any>,
    response: string | undefined,
    body: Buffer, filename: string
): Promise<string> => {
    // Prepare the body and metadata.
    let requestBody: Buffer | undefined = body;
    let contentType: string | undefined;
    switch (postAs.type) {
        case "b64": {
            const u = new URL(url);
            u.searchParams.append(postAs.key, body.toString("base64"));
            url = u.toString();
            requestBody = undefined;
            break;
        }
        case "multipart": {
            const form = new FormData();
            form.append(postAs.key, body, {
                contentType: ((await fromBuffer(body)) || {mime: "application/octet-stream"}).mime,
                filename
            });
            requestBody = form.getBuffer();
            contentType = form.getHeaders()["content-type"];
            break;
        }
        case "urlencoded": {
            requestBody = Buffer.from(`${encodeURIComponent(postAs.key)}=${encodeURIComponent(requestBody.toString("binary"))}`);
            contentType = "application/x-www-form-urlencoded";
            break;
        }
        case "raw": {
            contentType = ((await fromBuffer(body)) || {mime: "application/octet-stream"}).mime;
            break;
        }
    }
    if (headers) {
        Object.keys(headers).forEach(key => {
            headers![key] = configSubstrings(headers![key], config, filename);
        });
        if (contentType) headers["Content-Type"] = contentType;
    } else {
        if (contentType) headers = {"Content-Type": contentType};
        else headers = {};
    }

    // Run the request.
    url = configSubstrings(url, config, filename);
    const res = await fetch(url, {method, body: requestBody, headers});
    if (!res.ok) throw new Error(`Uploader returned the status ${res.status}.`);
    if (!response) return await res.text();

    // Parse the response.
    const json = await res.json();
    const PARAM = /%(.+?)%/;
    for (;;) {
        let scopedJson = json;
        const x: RegExpMatchArray | null = response.match(PARAM);
        if (!x) break;
        const keySplit = x[1].split(".");
        for (const keyPart of keySplit) {
            const n = Number(keyPart);
            if (isNaN(n)) {
                // If this isn't a number, it's a key.
                scopedJson = scopedJson[keyPart];
            } else {
                // This is a index.
                scopedJson = scopedJson[n];
            }
        }
        if (typeof scopedJson === "undefined") throw new Error("Key not found.");
        response = response.replace(x[0], String(scopedJson));
    }
    return String(response);
};

export const category: Category = {
    name: "HTTPS uploaders",
    description: "These are uploaders which use HTTPS bodies to upload."
};
