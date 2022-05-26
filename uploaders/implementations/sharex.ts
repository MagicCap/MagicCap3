import sxcu from "../protocols/sharex";
import { category } from "../protocols/http";
import { Uploader } from "../../sharedTypes";
// @ts-ignore
import icon from "../icons/sharex.png";

export const sharex: Uploader = {
    name: "ShareX",
    description: "ShareX SXCU compatibility for MagicCap.",
    category,
    icon,
    options: [
        {
            key: "sxcu_data",
            name: "SXCU",
            type: "json",
            required: true,
            extensions: ["sxcu"],
            secret: true,
        },
    ],
    upload: (config: Map<string, any>, data: Buffer, filename: string) => sxcu(
        data, filename, config.get("sxcu_data")),
};
