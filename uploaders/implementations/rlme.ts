import http, { category } from "../protocols/http";
import { Uploader } from "../../sharedTypes";
// @ts-ignore
import icon from "../icons/rlme.png";

export const rlme: Uploader = {
    name: "RATELIMITED.ME",
    description: "No bull****, just files.",
    category,
    icon,
    options: [
        {
            key: "rlme_token",
            name: "Token",
            type: "password",
            required: true,
            secret: true,
        },
        {
            key: "rlme_domain",
            name: "Domain",
            type: "text",
            required: true,
            default: "ratelimited.me",
            secret: false,
        },
    ],
    upload: (config: Map<string, any>, data: Buffer, filename: string) => http(
        "https://api.ratelimited.me/upload/pomf?key={rlme_token}", "POST",
        {type: "multipart", key: "files[]"}, undefined,
        config, "https://{rlme_domain}/%files.0.url%", data, filename),
};
