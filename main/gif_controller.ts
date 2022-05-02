import { spawn } from "child_process";
import { Tray } from "electron";
import { join } from "path";
import { flatPromise } from "./utils";

class GIFEncoderGoBinary {
    private gifPromise: Promise<Buffer | null>;
    private interrupt: () => void;
    private cancelResolver: () => void;

    constructor(x: number, y: number, width: number, height: number) {
        // Create the env variables.
        const env = Object.assign({}, process.env);
        env.X = x.toString();
        env.Y = y.toString();
        env.WIDTH = width.toString();
        env.HEIGHT = height.toString();

        // Spawn the process.
        const proc = spawn(`${__MAGICCAP_DIST_FOLDER__}/gif`, {env});

        // Handle interrupts.
        let alreadyRan = false;
        this.interrupt = () => {
            // This should only run once.
            if (alreadyRan) return;
            alreadyRan = true;

            // Interrupt the process.
            process.kill(proc.pid!, "SIGINT");
        };

        // Create a promise for the process.
        const procPromise = new Promise<Buffer>((resolve, reject) => {
            // Defines the error string.
            let errorString = "";

            // Defines stdout chunks.
            const stdoutChunks: Buffer[] = [];

            // Handle stdout.
            proc.stderr.on("data", chunk => {
                errorString += chunk.toString();
            });

            // Handle stdout.
            proc.stdout.on("data", chunk => stdoutChunks.push(chunk));

            // Handle exit.
            proc.on("exit", code => {
                if (code === null) {
                    reject("No exit code for some reason");
                } else {
                    if (code === 0) {
                        // A zero status code means success. We should combine all the buffers and return it.
                        if (stdoutChunks.length === 1) {
                            // Just return the first buffer. We do not need to combine them.
                            resolve(stdoutChunks[0]);
                        }
                        let totalSize = 0;
                        for (const chunk of stdoutChunks) totalSize += chunk.length;
                        const finalBuf = Buffer.allocUnsafe(totalSize);
                        let offset = 0;
                        for (const chunk of stdoutChunks) {
                            chunk.copy(finalBuf, offset);
                            offset += chunk.length;
                        }
                        resolve(finalBuf);
                        return;
                    }

                    // Return the error string.
                    reject(new Error(errorString));
                }
            });
        });

        // Create a flat promise to cancel.
        const [cancel, cancelPromise] = flatPromise<void>();
        this.cancelResolver = cancel;

        // Create a promise race for the GIF promise vs the cancel.
        this.gifPromise = Promise.race([procPromise, cancelPromise]).then(x => {
            if (x) {
                // This was not cancelled and is the buffer.
                // Cancel the cancel promise and then return.
                cancel();
                return x;
            }

            // Return null and kill the Go process.
            proc.kill();
            return null;
        });
    }

    cancel() {
        this.cancelResolver();
    }

    stop() {
        this.interrupt();
    }

    async wait() {
        return await this.gifPromise;
    }
}

let handlers: {go: GIFEncoderGoBinary; tray: Tray}[] = [];

export default async (x: number, y: number, width: number, height: number) => {
    // Create the object to wrap the Go binary.
    const go = new GIFEncoderGoBinary(x, y, width, height);

    // Create a tray icon.
    const tray = new Tray(join(__MAGICCAP_DIST_FOLDER__, "..", "assets", "stop.png"));

    // Push the handler.
    const obj = {go, tray};
    handlers.push(obj);

    try {
        // Handle the tray click event.
        tray.once("click", () => {
            // Stop the capture.
            go.stop();

            // Set the image to the cog.
            tray.setImage(join(__MAGICCAP_DIST_FOLDER__, "..", "assets", "cog.png"));
        });

        // Wait for the process to finish.
        return await go.wait();
    } finally {
        // Remove the tray icon.
        tray.destroy();

        // Remove the object from the array.
        handlers = handlers.splice(handlers.indexOf(obj), 1);
    }
};

export const killGifs = () => {
    const oldHandlers = handlers;
    handlers = [];
    for (const handler of oldHandlers) {
        handler.go.cancel();
        handler.tray.destroy();
    }
};
