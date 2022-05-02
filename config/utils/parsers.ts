import { JSONValue } from "../../sharedTypes";

export const jsonParser = (s: string): JSONValue => {
    // Basically just parse as JSON.
    // If this is invalid, it will throw.
    return JSON.parse(s);
};
