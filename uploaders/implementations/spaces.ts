import s3Proto from "../protocols/s3";
import category from "../custom_protocol_category";
import { Uploader } from "../../sharedTypes";
// @ts-ignore
import icon from "../icons/spaces.png";

const regions = [
    "NYC3", "AMS3",
    "SFO3", "SPG1",
    "FRA1"
];

export const spaces: Uploader = {
    name: "DigitalOcean Spaces",
    description: "DigitalOcean Spaces is a file storage service created by DigitalOcean.",
    category,
    icon,
    options: [
        {
            key: "spaces_region",
            name: "Bucket Region",
            type: "enum",
            options: regions,
            required: true,
            secret: false
        },
        {
            key: "spaces_access_key_id",
            name: "Access Key ID",
            type: "text",
            required: true,
            secret: true
        },
        {
            key: "spaces_secret_access_key",
            name: "Secret Access Key",
            type: "password",
            required: true,
            secret: true
        },
        {
            key: "spaces_bucket_name",
            name: "Bucket Name",
            type: "text",
            required: true,
            secret: true
        },
        {
            key: "spaces_bucket_url",
            name: "Bucket URL",
            type: "url",
            required: true,
            secret: false
        }
    ],
    upload: (config: Map<string, any>, data: Buffer, filename: string) => s3Proto(
        config.get("spaces_access_key_id"), config.get("spaces_secret_access_key"),
        `https://${regions[config.get("spaces_region")]}.digitaloceanspaces.com`,
        config.get("spaces_bucket_name"), config.get("spaces_bucket_url"), data, filename)
};
