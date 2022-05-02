import { category } from "../protocols/ftp";
import sftp from "../protocols/sftp";
import { Uploader } from "../../sharedTypes";
// @ts-ignore
import icon from "../icons/sftp.png";

export const sftpImpl: Uploader = {
    name: "SFTP",
    description: "SFTP is a secure iteration of FTP used by a lot of hosting providers.",
    category,
    icon,
    options: [
        {
            key: "sftp_hostname",
            name: "SFTP Server Hostname",
            type: "text",
            required: true,
            secret: true
        },
        {
            key: "sftp_port",
            name: "SFTP Server Port",
            type: "uint",
            min: 1,
            max: 65535,
            default: 22,
            required: true,
            secret: false
        },
        {
            key: "sftp_username",
            name: "SFTP Username",
            type: "text",
            required: true,
            secret: true
        },
        {
            key: "sftp_auth_method",
            name: "SFTP Authentication Method",
            type: "enum",
            options: ["Key Based Authentication", "Password Authentication"],
            default: 0,
            required: true,
            secret: false,
            conditional: {
                "Key Based Authentication": [
                    {
                        key: "sftp_private_key",
                        name: "SFTP Private Key",
                        type: "file",
                        extensions: ["pem"],
                        required: false,
                        secret: true
                    }
                ],
                "Password Authentication": [
                    {
                        key: "sftp_password",
                        name: "SFTP Password",
                        type: "password",
                        required: false,
                        secret: true
                    }
                ]
            }
        },
        {
            key: "sftp_directory",
            name: "SFTP Directory",
            type: "text",
            default: "/",
            required: true,
            secret: false
        },
        {
            key: "sftp_domain",
            name: "SFTP Base URL",
            type: "url",
            required: true,
            secret: false
        }
    ],
    upload: async (config: Map<string, any>, data: Buffer, filename: string) => {
        // Handle the authentication method.
        const x: any = {};
        if (config.get("sftp_auth_method") === 0) {
            let k = config.get("sftp_private_key") as string | undefined;
            if (k === undefined) k = "";
            x.privateKey = k;
        } else {
            let p = config.get("sftp_password") as string | undefined;
            if (p === undefined) p = "";
            x.password = p;
        }

        // Call the sftp protocol.
        return await sftp(
            config.get("sftp_hostname") as string, config.get("sftp_port") as number,
            config.get("sftp_username") as string, x, config.get("sftp_directory") as string,
            filename, data, config.get("sftp_domain") as string);
    }
};
