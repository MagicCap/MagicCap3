import http, { category } from "../protocols/http";
import { Uploader } from "../../sharedTypes";
// @ts-ignore
import icon from "../icons/shutter.png";

export const shutter: Uploader = {
    name: "shutter.host",
    description: "Shutter is one of the fastest image uploaders.",
    icon,
    category,
    options: [
        {
            key: "shtr_id",
            name: "ID",
            type: "text",
            required: true,
            secret: true,
        },
        {
            key: "shtr_token",
            name: "Token",
            type: "password",
            required: true,
            secret: true,
        },
    ],
    upload: (config: Map<string, any>, data: Buffer, filename: string) => http(
        "https://shutter.host/api/upload", "POST",
        {type: "multipart", key: "file"}, {Authorization: "{shtr_id}:{shtr_token}"},
        config, "%url%", data, filename),
};
