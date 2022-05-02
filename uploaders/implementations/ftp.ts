import ftp, { category } from "../protocols/ftp";
import { Uploader } from "../../sharedTypes";
// @ts-ignore
import icon from "../icons/ftp.png";

export const ftpImpl: Uploader = {
    name: "FTP",
    description: "FTP is a protocol for file management used by a lot of web hosting providers.",
    category,
    icon,
    options: [
        {
            key: "ftp_hostname",
            name: "FTP Server Hostname",
            type: "text",
            required: true,
            secret: true
        },
        {
            key: "ftp_port",
            name: "FTP Server Port",
            type: "uint",
            min: 1,
            max: 65535,
            default: 21,
            required: true,
            secret: false
        },
        {
            key: "ftp_username",
            name: "FTP Username",
            type: "text",
            required: true,
            secret: false
        },
        {
            key: "ftp_password",
            name: "FTP Password",
            type: "password",
            required: true,
            secret: true
        },
        {
            key: "ftp_directory",
            name: "FTP Directory",
            type: "text",
            default: "/",
            required: true,
            secret: false
        },
        {
            key: "ftp_domain",
            name: "FTP Base URL",
            type: "url",
            required: true,
            secret: false
        },
        {
            key: "ftp_secure",
            name: "Use Secure Connection",
            type: "boolean",
            default: true,
            required: true,
            secret: false
        }
    ],
    upload: async (config: Map<string, any>, data: Buffer, filename: string) => {
        let sec = config.get("ftp_secure");
        if (sec === undefined) sec = true;
        return await ftp(config.get("ftp_hostname") as string,
            config.get("ftp_port") as number, sec, config.get("ftp_username") as string,
            config.get("ftp_password") as string, config.get("ftp_directory") as string,
            config.get("ftp_domain") as string, data, filename);
    }
};
