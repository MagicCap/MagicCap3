import http, { category } from "../protocols/http";
import { Uploader } from "../../sharedTypes";
// @ts-ignore
import icon from "../icons/elixire.png";

export const elixire: Uploader = {
    name: "elixi.re",
    description: "Lunae Bunae Elixirade",
    category,
    icon,
    options: [
        {
            key: "elixire_token",
            name: "Token",
            type: "password",
            required: true,
            secret: true,
        },
    ],
    upload: (config: Map<string, any>, data: Buffer, filename: string) => http(
        "https://elixi.re/api/upload", "POST",
        {type: "multipart", key: "f"}, {Authorization: "{elixire_token}"},
        config, "%url%", data, filename),
};
