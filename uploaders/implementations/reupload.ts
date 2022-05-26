import http, { category } from "../protocols/http";
import { Uploader } from "../../sharedTypes";
// @ts-ignore
import icon from "../icons/reupload.png";

export const reupload: Uploader = {
    name: "reupload.gg",
    description: "ReUpload.gg Sharing Service",
    category,
    icon,
    options: [
        {
            key: "reupload_token",
            name: "Token",
            type: "password",
            required: true,
            secret: true,
        },
    ],
    upload: (config: Map<string, any>, data: Buffer, filename: string) => http(
        "https://api.reupload.gg/v1/upload/image", "POST",
        {type: "multipart", key: "file"}, {Authorization: "Bearer {reupload_token}"},
        config, "%url%", data, filename),
};
