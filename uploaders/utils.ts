// Used to handle config substrings.
const PARAM = /{(.+?)}/;
export const configSubstrings = (v: string, config: Map<string, any>, filename: string): string => {
    for (;;) {
        const x = v.match(PARAM);
        if (!x) break;
        switch (x[1]) {
            case "sub":
                v = v.replace(x[0], filename.split(".").shift()!);
                break;
            default:
                v = v.replace(x[0], String(config.get(x[1])));
        }
    }
    return v;
};
