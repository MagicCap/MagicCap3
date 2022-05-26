import s3Proto from "../protocols/s3";
import category from "../custom_protocol_category";
import { Uploader } from "../../sharedTypes";
// @ts-ignore
import icon from "../icons/s3.png";

export const s3: Uploader = {
    name: "S3",
    description: "S3 is a protocol developed by Amazon for their hosting service.",
    category,
    icon,
    options: [
        {
            key: "s3_access_key_id",
            name: "Access Key ID",
            type: "text",
            required: true,
            secret: true,
        },
        {
            key: "s3_secret_access_key",
            name: "Secret Access Key",
            type: "text",
            required: true,
            secret: true,
        },
        {
            key: "s3_endpoint",
            name: "Endpoint",
            type: "url",
            required: true,
            default: "https://s3.eu-west-2.amazonaws.com",
            secret: false,
        },
        {
            key: "s3_bucket_name",
            name: "Bucket Name",
            type: "text",
            required: true,
            secret: true,
        },
        {
            key: "s3_bucket_url",
            name: "Bucket URL",
            type: "url",
            required: true,
            secret: false,
        },
    ],
    upload: (config: Map<string, any>, data: Buffer, filename: string) => s3Proto(
        config.get("s3_access_key_id"), config.get("s3_secret_access_key"),
        config.get("s3_endpoint"), config.get("s3_bucket_name"),
        config.get("s3_bucket_url"), data, filename),
};
