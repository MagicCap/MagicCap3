import { ipcRenderer } from "electron";
import { AnnouncementPayload } from "../../sharedTypes";

type AnnouncementCallback = (self: boolean, data: any) => void;

const events: {[name: string]: AnnouncementCallback[]} = {};

export function on(channel: string, cb: AnnouncementCallback): () => void {
    let a = events[channel];
    if (!a) {
        a = [];
        events[channel] = a;
    }
    a.push(cb);
    
    return () => {
        for (let i = 0; i < a.length; i++) {
            if (a[i] === cb) {
                if (a.length === 1) delete events[channel];
                else a.splice(i, 1);
                break;
            }
        }
    };
}

const call = (self: boolean, channel: string, payload: any) => {
    const a = events[channel];
    if (!a) throw new Error(`No listeners for ${channel}.`);
    for (const cb of a) cb(self, payload);
};

ipcRenderer.on("selector:announcement", (_: any, data: AnnouncementPayload) => {
    call(false, data.channel, data.payload);
});

export const dispatch = (channel: string, payload: any) => {
    call(true, channel, payload);
    ipcRenderer.send(`selector:announcement:${window.location.hash.substr(1)}`, {channel, payload});
};
