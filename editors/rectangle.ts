import { EditorCtx, EditorRegisterCtx } from "../sharedTypes";
import sharp from "sharp";
// @ts-ignore
import icon from "./icons/rectangle.png";

async function cb(ctx: EditorCtx): Promise<Buffer> {
    const region = await ctx.getRegion(
        ctx.event.relativeTop * ctx.display.scaleFactor,
        ctx.event.relativeLeft * ctx.display.scaleFactor,
        ctx.event.width * ctx.display.scaleFactor,
        ctx.event.height * ctx.display.scaleFactor);
    const metadata = await sharp(region).metadata();
    const rgb = ctx.event.rgb;
    return sharp({
        // @ts-ignore: This technically isn't valid in sharp land, but it's fast and works.
        create: {
            width: metadata.width,
            height: metadata.height,
            background: { r: rgb[0], g: rgb[1], b: rgb[2] },
            channels: 4,
        },
    }).png().toBuffer();
}

export const rectangle = (ctx: EditorRegisterCtx): (() => void) => ctx.register({
    title: "Rectangle",
    description: "Creates a rectangle on the image.",
    index: 4,
    icon,
}, cb);
