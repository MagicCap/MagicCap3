import { JSONValue } from "../../sharedTypes";

export const jsonLoader = (v: JSONValue): string => {
    // Load to JSON but indent it.
    return JSON.stringify(v, null, 4);
};
