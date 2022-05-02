import { EditorCtx, EditorRegisterCtx } from "../sharedTypes";
import sharp from "sharp";
// @ts-ignore
import icon from "./icons/hollow_rectangle.png";

async function cb(ctx: EditorCtx): Promise<Buffer> {
    const region = await ctx.getRegion(
        ctx.event.relativeTop * ctx.display.scaleFactor,
        ctx.event.relativeLeft * ctx.display.scaleFactor,
        ctx.event.width * ctx.display.scaleFactor,
        ctx.event.height * ctx.display.scaleFactor);
    const metadata = await sharp(region).metadata();
    const rgb = ctx.event.rgb;
    const svg = Buffer.from(`
        <svg viewBox="0 0 ${metadata.width} ${metadata.height}" xmlns="http://www.w3.org/2000/svg" version="1.1" preserveAspectRatio="none">
            <rect width="${metadata.width}" height="${metadata.height}" stroke="rgb(${rgb[0]}, ${rgb[1]}, ${rgb[2]})" stroke-width="4" fill="none" />
        </svg>
    `);
    return sharp(svg)
        .resize(metadata.width!, metadata.height!)
        .png()
        .toBuffer();
}

export const hollowRectangle = (ctx: EditorRegisterCtx): (() => void) => ctx.register({
    title: "Hollow Rectangle",
    description: "Creates a hollow rectangle on the image.",
    index: 5,
    icon
}, cb);
