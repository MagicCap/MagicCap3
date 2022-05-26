import http, { category } from "../protocols/http";
import { Uploader } from "../../sharedTypes";
// @ts-ignore
import icon from "../icons/lunus.png";

export const novus: Uploader = {
    name: "Lunus",
    description: "Simple screenshot & file sharing provided by SunburntRock89 and Red_Eye_Computing.",
    category,
    icon,
    options: [
        {
            key: "novus_token",
            name: "Token",
            type: "password",
            required: true,
            secret: true,
        },
    ],
    upload: (config: Map<string, any>, data: Buffer, filename: string) => http(
        "https://lunus.xyz/api/upload", "POST",
        {type: "multipart", key: "file"}, {Authorization: "Bearer {novus_token}"},
        config, "%url%", data, filename),
};
