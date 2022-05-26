import { EditorCtx, EditorRegisterCtx } from "../sharedTypes";
import sharp from "sharp";
// @ts-ignore
import icon from "./icons/blur.png";

async function cb(ctx: EditorCtx): Promise<Buffer> {
    const region = await ctx.getRegion(
        ctx.event.relativeTop * ctx.display.scaleFactor,
        ctx.event.relativeLeft * ctx.display.scaleFactor,
        ctx.event.width * ctx.display.scaleFactor,
        ctx.event.height * ctx.display.scaleFactor);
    return await sharp(region).blur(10).toBuffer();
}

export const blur = (ctx: EditorRegisterCtx): (() => void) => ctx.register({
    title: "Blur",
    description: "Allows you to blur the specified region.",
    index: 0,
    icon,
}, cb);
