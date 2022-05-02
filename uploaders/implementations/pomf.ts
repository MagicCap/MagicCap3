import http, { category } from "../protocols/http";
import { Uploader } from "../../sharedTypes";
// @ts-ignore
import icon from "../icons/pomf.png";

export const pomf: Uploader = {
    name: "POMF",
    description: "Pomf is a simple file uploading and sharing platform..",
    category,
    icon,
    options: [
        {
            key: "pomf_domain",
            name: "Domain",
            type: "url",
            required: true,
            secret: true
        },
        {
            key: "pomf_token",
            name: "Token",
            type: "password",
            required: false,
            secret: true
        }
    ],
    upload: (config: Map<string, any>, data: Buffer, filename: string) => http("{pomf_domain}", "POST",
        {type: "multipart", key: "files[]"}, {token: "{pomf_token}"},
        config, "%files.0.url%", data, filename)
};
