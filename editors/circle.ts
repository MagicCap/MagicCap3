import { EditorCtx, EditorRegisterCtx } from "../sharedTypes";
import sharp from "sharp";
// @ts-ignore
import icon from "./icons/circle.png";

async function cb(ctx: EditorCtx): Promise<Buffer> {
    const region = await ctx.getRegion(
        ctx.event.relativeTop * ctx.display.scaleFactor,
        ctx.event.relativeLeft * ctx.display.scaleFactor,
        ctx.event.width * ctx.display.scaleFactor,
        ctx.event.height * ctx.display.scaleFactor);
    const metadata = await sharp(region).metadata();
    const y = Math.floor(metadata.height! / 2);
    const x = Math.floor(metadata.width! / 2);
    const rgb = ctx.event.rgb;
    const svg = Buffer.from(`
        <svg viewBox="0 0 ${metadata.width} ${metadata.height}" xmlns="http://www.w3.org/2000/svg">
            <circle style="fill:rgb(${rgb[0]}, ${rgb[1]}, ${rgb[2]})" cx="${x}" cy="${y}" r="${x > y ? y : x}"/>
        </svg>
    `);
    return sharp(svg)
        .resize(metadata.width!, metadata.height!)
        .png()
        .toBuffer();
}

export const circle = (ctx: EditorRegisterCtx): (() => void) => ctx.register({
    title: "Circle",
    description: "Creates a circle on the image.",
    index: 2,
    icon,
}, cb);
