import { EditorCtx, EditorRegisterCtx } from "../sharedTypes";
import Jimp from "jimp";
// @ts-ignore
import icon from "./icons/pixelate.png";

async function cb(ctx: EditorCtx): Promise<Buffer> {
    const region = await ctx.getRegion(
        ctx.event.relativeTop * ctx.display.scaleFactor,
        ctx.event.relativeLeft * ctx.display.scaleFactor,
        ctx.event.width * ctx.display.scaleFactor,
        ctx.event.height * ctx.display.scaleFactor);
    return await (await Jimp.read(region)).pixelate(10).getBufferAsync("image/png");
}

export const pixelate = (ctx: EditorRegisterCtx): (() => void) => ctx.register({
    title: "Pixelate",
    description: "Allows you to pixelate the specified region.",
    index: 1,
    icon,
}, cb);
