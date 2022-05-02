import { Uploader, UploaderOption } from "../sharedTypes";

export default (exports: any) => {
    const keys: string[] = [];
    const scanOptions = (opts: UploaderOption[]) => {
        for (const opt of opts) {
            if (opt.type === "enum" && opt.conditional) {
                Object.values(opt.conditional).forEach(value => scanOptions(value));
            }
            if (opt.secret) keys.push(opt.key);
        }
    };
    Object.keys(exports).forEach(key => {
        if (!key.startsWith("_") && key !== "secretKeys") {
            const value: Uploader = exports[key];
            scanOptions(value.options);
        }
    });
    return keys;
};
