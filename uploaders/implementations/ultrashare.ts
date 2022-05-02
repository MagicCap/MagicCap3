import http, { category } from "../protocols/http";
import { Uploader } from "../../sharedTypes";
// @ts-ignore
import icon from "../icons/ultrashare.png";

export const ultrashare: Uploader = {
    name: "UltraShare",
    description: "UltraShare is an all in one server for screenshots, files, images, and links.",
    category,
    icon,
    options: [
        {
            key: "ultra_host",
            name: "Hostname",
            type: "text",
            required: true,
            secret: true
        },
        {
            key: "ultra_key",
            name: "Key",
            type: "password",
            required: true,
            secret: true
        }
    ],
    upload: (config: Map<string, any>, data: Buffer, filename: string) => http(
        "{ultra_host}/api/upload", "POST",
        {type: "raw"}, {Authorization: "{ultra_key}", fileext: "{ext}", "User-Agent": "MagicCapUltraShare/1.0"},
        config, "%url%", data, filename)
};
