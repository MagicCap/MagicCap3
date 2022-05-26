import { ConfigInterface, Uploader } from "../../sharedTypes";
import { auth, drive } from "@googleapis/drive";
import mime from "mime";
import fetch from "node-fetch";
import category from "../custom_protocol_category";
import * as streamifier from "streamifier";
// @ts-ignore
import icon from "../icons/gdrive.png";

export const gdrive: Uploader = {
    name: "Google Drive",
    description: "Google Drive is a cloud storage service.",
    category,
    icon,
    options: [
        {
            key: "gdrive_client_id",
            name: "Client ID",
            type: "text",
            required: true,
            secret: true,
        },
        {
            key: "gdrive_client_secret",
            name: "Client Secret",
            type: "text",
            required: true,
            secret: true,
        },
        {
            key: "gdrive_token",
            name: "Token",
            type: "oauth2",
            authorizationUrl: "https://accounts.google.com/o/oauth2/v2/auth",
            clientIdKey: "gdrive_client_id",
            accessType: "offline",
            scope: "https://www.googleapis.com/auth/drive",
            callback: async (config: ConfigInterface, urlParams: {[key: string]: string}) => {
                // Validate the scope is the same.
                if (urlParams.scope !== "https://www.googleapis.com/auth/drive") throw new Error("Scope is not as expected.");

                // Check if the code is provided.
                const code = urlParams.code;
                if (code === undefined) throw new Error("No code provided.");

                // Create the URL.
                const u = new URL("https://www.googleapis.com/oauth2/v4/token");
                u.searchParams.append("code", code);
                u.searchParams.append("client_id", config.getConfig("gdrive_client_id") as string);
                u.searchParams.append("client_secret", config.getConfig("gdrive_client_secret") as string);
                u.searchParams.append("redirect_uri", "http://127.0.0.1:61223/");
                u.searchParams.append("grant_type", "authorization_code");

                // Make the POST request.
                const resp = await fetch(u.toString(), {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/x-www-form-urlencoded",
                    },
                }).then(async res => {
                    if (!res.ok) throw new Error(`Request returned status code ${res.status}`);
                    return await res.json();
                });

                // Return the JSON string.
                return JSON.stringify({
                    expiresAt: Math.floor((new Date() as unknown) as number / 1000) + resp.expires_in, token: resp.access_token,
                    refreshToken: resp.refresh_token,
                });
            },
            required: true,
            secret: true,
        },
    ],
    upload: async (config: Map<string, any>, data: Buffer, filename: string) => {
        // Get the token.
        const tokenBlob = config.get("gdrive_token") as string;
        if (tokenBlob === undefined) throw new Error("No token blob provided.");
        const o: {[key: string]: string} = JSON.parse(tokenBlob);
        let {token, refreshToken, expiresAt} = o;

        // Handle refreshing the token.
        const dateNumber = (new Date() as unknown) as number;
        if (Math.floor(dateNumber / 1000) > config.get("gdrive_expires_at")) {
            // Refresh the token.
            const u = new URL("https://www.googleapis.com/oauth2/v4/token");
            u.searchParams.append("client_id", config.get("gdrive_client_id") as string);
            u.searchParams.append("client_secret", config.get("gdrive_client_secret") as string);
            u.searchParams.append("refresh_token", refreshToken);
            u.searchParams.append("grant_type", "refresh_token");

            // Make the POST request.
            const resp = await fetch(u.toString(), {
                method: "POST",
                headers: {
                    "Content-Type": "application/x-www-form-urlencoded",
                },
            }).then(async res => {
                if (!res.ok) throw new Error(`Request returned status code ${res.status}`);
                return await res.json();
            });

            // Update the token.
            token = resp.access_token;
            refreshToken = resp.refresh_token;
            expiresAt = Math.floor((new Date() as unknown) as number / 1000) + resp.expires_in;

            // Update the config.
            config.set("gdrive_token", JSON.stringify({
                expiresAt, token, refreshToken,
            }));
        }

        // Handle creating the client.
        const oauth = new auth.OAuth2();
        oauth.setCredentials({access_token: token});
        const d = drive({
            version: "v3",
            auth: oauth,
        });
        const mimeType = mime.lookup(filename.split(".").pop()!);

        // Handle uploading the file.
        const driveResponse = await d.files.create({
            requestBody: {
                name: filename,
                mimeType,
            },
            media: {
                mimeType,
                body: streamifier.createReadStream(data),
            },
        });

        // Handle the permission.
        // @ts-ignore
        await d.permissions.create({
            // @ts-ignore
            fileId: driveResponse.data.id,
            resource: {
                role: "reader",
                type: "anyone",
            },
            fields: "id",
        });

        // Return the URL.
        return `https://drive.google.com/file/d/${driveResponse.data.id}/view?usp=sharing`;
    },
};
