import express, { Application } from "express";
import cookieParser from "cookie-parser";
import http from "http";
import { v4 } from "uuid";
import { OAuthClientInformation } from "../sharedTypes";

export type OAuthFlowStartResult = {
    initUrl: string;
    id: string;
};

type OAuthFlowCallback = (urlParams: {[key: string]: string}) => void;

type OAuthFlowWaiter = {
    cb: OAuthFlowCallback;
    oauthUrl: string;
    state: string;
};

const waiters: Map<string, OAuthFlowWaiter> = new Map();

export const startOAuth2Flow = (info: OAuthClientInformation, cb: OAuthFlowCallback): OAuthFlowStartResult => {
    // Get the ID for this flow.
    const flowId = v4();

    // Parse the oauth URL.
    const u = new URL(info.authorizationUrl);

    // Get the ID to use for state.
    const state = v4();

    // Add the various params.
    u.searchParams.set("client_id", info.clientId);
    u.searchParams.set("response_type", "code");
    u.searchParams.set("redirect_uri", "http://127.0.0.1:61223/");
    if (info.scope) u.searchParams.set("scope", info.scope);
    if (info.accessType) u.searchParams.set("access_type", info.accessType);
    u.searchParams.set("state", state);

    // Make the URL.
    const oauthUrl = u.toString();

    // Add the waiter to the map.
    waiters.set(flowId, {cb, oauthUrl, state});

    // Return the result.
    return {initUrl: `http://127.0.0.1:61223/oauth/${flowId}`, id: flowId};
};

export const cancelOAuth2Flow = (id: string) => {
    waiters.delete(id);
};

const initializeExpress = (app: Application) => {
    // Use the cookie parser.
    app.use(cookieParser());

    // Handle initializing the OAuth2 flow with the ID.
    app.get("/oauth/:id", (req, res) => {
        // Get the relevant waiter.
        const id = req.params.id;
        const w = waiters.get(id);
        if (!w) {
            res.status(400).send("Invalid OAuth2 flow ID. Please try authenticating again!");
            return;
        }

        // Plant a cookie that maps state > flow ID.
        res.cookie(w.state, id, {maxAge: 3600000});

        // Redirect to the OAuth2 flow.
        res.redirect(w.oauthUrl);
    });

    // Handle the root path.
    app.get("/", (req, res) => {
        // Handle getting the flow ID if this is a valid oauth request.
        const state = req.query.state as string;
        if (!state) {
            res.status(200).send(`<h1>Welcome to the MagicCap API!</h1>
<p>This is an API for MagicCap for situations where it needs to speak to the outside world. One example where this is used is OAuth2.</p>`);
            return;
        }
        const flowId = req.cookies[state];
        if (!flowId) {
            res.status(400).send("Invalid OAuth2 state. Please try authenticating again!");
            return;
        }
        res.clearCookie(state);

        // Get the flow.
        const w = waiters.get(flowId);
        if (!w) {
            res.status(400).send("OAuth2 flow was cancelled or completed. Please try authenticating again!");
            return;
        }

        // Delete the flow.
        waiters.delete(flowId);

        // Get the URL params.
        const urlParams: {[key: string]: string} = {};
        for (const [key, value] of Object.entries(req.query)) {
            if (typeof value === "string") urlParams[key] = value;
        }

        // Call the callback.
        w.cb(urlParams);

        // Send the HTML response.
        res.status(200).send("<p>Please close this tab and return to MagicCap.</p><script>window.close();</script>");
    });
};

const makeGlobalExpressListener = async () => {
    let localMiddleware: ((req: http.IncomingMessage) => boolean) | undefined;
    const s = http.createServer((req, res) => {
        if (localMiddleware) {
            // Make sure this address is allowed if the middleware is active.
            if (!localMiddleware(req)) return;
        }
        // @ts-ignore
        const s = globalThis.__MAGICCAP_EXPRESS__;
        if (s) s.handle(req, res);
    });
    const bindResultAsync = () => new Promise((res, rej) => {
        let listeningHnd: () => void;
        const errorHnd = (err: Error) => {
            s.removeListener("listening", listeningHnd);
            rej(err);
        };
        listeningHnd = () => {
            s.removeListener("error", errorHnd);
            res(null);
        };
        s.once("error", errorHnd);
        s.once("listening", listeningHnd);
    });
    try {
        let p = bindResultAsync();
        s.listen(61223, "127.0.0.1");
        try {
            await p;
        } catch (_) {
            // For some reason, macOS seems to have random TCP/IP tantrums.
            // In this event, we should try binding to 0.0.0.0 with some middleware
            // to prevent bad things.
            localMiddleware = req => {
                const addr = req.socket.address();
                // @ts-ignore: TypeScript hates this because addr can be {}, but the check
                // below will still fail because that would make it undefined... lol
                if (!["127.0.0.1", "::1"].includes(addr.address)) {
                    // Some random address. Ignore this.
                    req.socket.destroy();
                    return false;
                }
                return true;
            };
            p = bindResultAsync();
            s.listen(61223);
            await p;
            console.log(
                "We need to bind port 61223 to a wildcard because we can't bind to 127.0.0.1. This is " +
                "a known stupid macOS bug (unknown on Linux though), but don't worry, there's middleware " +
                "to make this secure.");
        }
        return true;
    } catch (err) {
        console.error(`Internal API failed to load!: ${err}`);
        return false;
    }
};

export default async () => {
    // Create the app.
    const app = express();

    // Initialize the express application.
    initializeExpress(app);

    // Make the web socket if required and mount the web server.
    // @ts-ignore
    if (!globalThis.__MAGICCAP_EXPRESS__) {
        if (!await makeGlobalExpressListener()) {
            // If this fails, we should return. This is because we don't want to
            // give the impression during future updates that there is a running
            // server.
            return;
        }
    }
    // @ts-ignore
    globalThis.__MAGICCAP_EXPRESS__ = app;
};
