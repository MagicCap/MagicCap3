// Implementation of special sftp case mentioned in uploaders/protocols/sftp.ts.
// Note this should NOT use any API's within main. It is strictly a protocol implementation.

import { spawn } from "child_process";

// @ts-ignore
globalThis.__MAGICCAP_SFTP__ = async (
    hostname: string, port: number, username: string,
    authentication: {password: string} | {privateKey: string},
    directory: string, filename: string, content: Buffer, domain: string
): Promise<string> => {
    // Make the SFTP process.
    const env = Object.assign({}, process.env);
    env.CONNECTION_BLOB = JSON.stringify({hostname, port, username, authentication, directory, filename, domain});
    const proc = spawn(`${__MAGICCAP_DIST_FOLDER__}/sftp`, {env});

    try {
        // Wait for the process to be ready.
        await new Promise<void>((res, rej) => {
            const killAllListeners = () => {
                proc.stderr.removeListener("data", error);
                proc.stdout.removeListener("data", out);
                proc.removeListener("error", error);
                proc.removeListener("exit", exit);
            };
            const error = (data: Error | any) => {
                killAllListeners();
                rej(data instanceof Error ? data : new Error(data.toString()));
            };
            const exit = (code: number) => {
                killAllListeners();
                rej(new Error("SFTP exited with code " + code + " before ready"));
            };
            const out = (data: any) => {
                killAllListeners();
                data = data.toString();
                if (data !== "r") rej(new Error(data));
                else res();
            };
            proc.stderr.on("data", error);
            proc.stdout.on("data", out);
            proc.on("error", error);
            proc.once("exit", exit);
        });

        // Handle doing std piping.
        return await new Promise<string>((res, rej) => {
            const killAllListeners = () => {
                proc.stderr.removeListener("data", error);
                proc.stdout.removeListener("data", out);
                proc.removeListener("error", error);
                proc.removeListener("exit", exit);
            };
            const error = (data: Error | any) => {
                killAllListeners();
                rej(data instanceof Error ? data : new Error(data.toString()));
            };
            const exit = (code: number) => {
                killAllListeners();
                rej(new Error("SFTP exited with code " + code + " before URL"));
            };
            const out = (data: any) => {
                killAllListeners();
                res(data.toString());
            };
            proc.stderr.on("data", error);
            proc.stdout.on("data", out);
            proc.on("error", error);
            proc.once("exit", exit);
            const alloc = Buffer.allocUnsafe(4);
            alloc.writeUint32LE(content.length, 0);
            proc.stdin.write(alloc);
            proc.stdin.write(content);
        });
    } finally {
        // Make sure the process is killed. 
        proc.kill();
    }
};
