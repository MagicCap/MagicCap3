import http, { category } from "../protocols/http";
import { Uploader } from "../../sharedTypes";
// @ts-ignore
import icon from "../icons/imgur.png";

export const imgur: Uploader = {
    name: "Imgur",
    description: "Imgur is an online image sharing community and image host founded by Alan Schaaf in 2009.",
    category,
    icon,
    options: [],
    upload: (config: Map<string, any>, data: Buffer, filename: string) => http(
        "https://api.imgur.com/3/image", "POST",
        {type: "multipart", key: "image"}, {Authorization: "Client-ID 5a085a33c43d27c"},
        config, "%data.link%", data, filename),
};
