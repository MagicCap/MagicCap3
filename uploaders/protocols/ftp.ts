import { Category } from "../../sharedTypes";
import Client from "ftp";

export default async (
    host: string, port: number, secure: boolean, user: string | undefined, password: string | undefined,
    ftpDirectory: string, baseUrl: string, body: Buffer, filename: string
) => {
    // Attempt a client connection.
    const client = await new Promise<Client>((res, rej) => {
        const c = new Client();
        c.on("ready", () => res(c));
        c.on("error", rej);
        c.connect({host, port, secure, user: user === undefined ? "anonymous" : user, password: password === undefined ? "anonymous@" : password});
    });

    try {
        // Get the FTP directory.
        ftpDirectory = ftpDirectory === "" ? "/" : ftpDirectory;
        if (!ftpDirectory.endsWith("/")) ftpDirectory += "/";

        // Await the file being put on the FTP server.
        await new Promise<void>((res, rej) => {
            client.put(body, `${ftpDirectory}${filename}`, err => {
                if (err) rej(err);
                else res();
            });
        });
    } finally {
        // Defer closing the client connection until the end of upload/error.
        client.destroy();
    }

    // Normalise the base URL.
    if (baseUrl.endsWith("/") || baseUrl.endsWith("\\")) baseUrl = baseUrl.slice(0, -1);

    // Return the URL.
    return `${baseUrl}/${filename}`;
};

export const category: Category = {
    name: "FTP uploaders",
    description: "These are uploaders which use FTP to upload."
};
