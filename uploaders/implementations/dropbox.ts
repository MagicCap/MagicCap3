import { ConfigInterface, Uploader } from "../../sharedTypes";
import fetch from "node-fetch";
import category from "../custom_protocol_category";
// @ts-ignore
import icon from "../icons/dropbox.png";

export const dropbox: Uploader = {
    name: "Dropbox",
    description: "Dropbox is a cloud storage service.",
    category,
    icon,
    options: [
        {
            key: "dropbox_client_id",
            name: "Client ID",
            type: "text",
            required: true,
            secret: true
        },
        {
            key: "dropbox_client_secret",
            name: "Client Secret",
            type: "text",
            required: true,
            secret: true
        },
        {
            key: "dropbox_path",
            name: "Path",
            type: "text",
            required: true,
            default: "/",
            secret: false
        },
        {
            key: "dropbox_link_password",
            name: "Link Password (Requires Paid Dropbox)",
            type: "password",
            required: false,
            secret: true
        },
        {
            key: "dropbox_token",
            name: "Token",
            type: "oauth2",
            authorizationUrl: "https://dropbox.com/oauth2/authorize",
            clientIdKey: "dropbox_client_id",
            callback: async (config: ConfigInterface, urlParams: {[key: string]: string}) => {
                // Get the code.
                const code = urlParams.code;
                if (code === undefined) throw new Error("No code provided.");

                // Get the client ID/secret.
                const clientId = config.getConfig("dropbox_client_id") as string;
                if (clientId === undefined) throw new Error("No client ID provided.");
                const clientSecret = config.getConfig("dropbox_client_secret") as string;
                if (clientSecret === undefined) throw new Error("No client secret provided.");

                // Make the URL.
                const u = new URL("https://api.dropboxapi.com/oauth2/token");
                u.searchParams.append("code", code);
                u.searchParams.append("grant_type", "authorization_code");
                u.searchParams.append("client_id", clientId);
                u.searchParams.append("client_secret", clientSecret);
                u.searchParams.append("redirect_uri", "http://127.0.0.1:61223/");

                // Try to make the request.
                let body: any;
                await fetch(u.toString(), {headers: {"Content-Type": "application/x-www-form-urlencoded"}, method: "POST"})
                    .then(async res => {
                        if (!res.ok) throw new Error(`Request returned status code ${res.status}`);
                        body = await res.json();
                    });
                if (body.access_token === undefined) throw new Error("No access token provided.");

                // Return the access token.
                return body.access_token as string;
            },
            required: true,
            secret: true
        }
    ],
    upload: async (config: Map<string, any>, data: Buffer, filename: string) => {
        // Get the dropbox path.
        let dropboxPath = config.get("dropbox_path") as string;
        if (dropboxPath === undefined) dropboxPath = "/";
        else if (!dropboxPath.endsWith("/")) dropboxPath += "/";
        dropboxPath += filename;

        // Do the upload.
        await fetch("https://content.dropboxapi.com/2/files/upload", {
            method: "POST",
            headers: {
                Authorization: `Bearer ${config.get("dropbox_token") as string}`,
                "Content-Type": "application/octet-stream",
                "Dropbox-API-Arg": JSON.stringify({path: dropboxPath})
            },
            body: data
        }).then(async res => {
            if (!res.ok) throw new Error(`Request returned status code ${res.status} (${await res.text()})`);
        });

        // Set the dropbox settings.
        const dropboxLinkPassword = config.get("dropbox_link_password") as string;
        const dropboxSettings = {
            requested_visibility: dropboxLinkPassword ? "password" : "public",
            link_password: dropboxLinkPassword ? dropboxLinkPassword : null
        };
        const dropboxResult = await fetch("https://api.dropboxapi.com/2/sharing/create_shared_link_with_settings", {
            method: "POST",
            headers: {
                Authorization: `Bearer ${config.get("dropbox_token") as string}`,
                "Content-Type": "application/json"
            },
            body: JSON.stringify({path: dropboxPath, settings: dropboxSettings})
        }).then(async res => {
            if (!res.ok) throw new Error(`Request returned status code ${res.status} (${await res.text()})`);
            return await res.json();
        });

        // Return the URL if present.
        if (!dropboxResult.url) throw new Error("No URL provided.");
        return dropboxResult.url as string;
    }
};
