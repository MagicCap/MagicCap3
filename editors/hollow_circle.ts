import { EditorCtx, EditorRegisterCtx } from "../sharedTypes";
import sharp from "sharp";
// @ts-ignore
import icon from "./icons/hollow_circle.png";

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
            <circle stroke="rgb(${rgb[0]}, ${rgb[1]}, ${rgb[2]})" cx="${x}" cy="${y}" r="${(x > y ? y : x) - 2}" stroke-width="2" fill="none" />
        </svg>
    `);
    return sharp(svg)
        .resize(metadata.width!, metadata.height!)
        .png()
        .toBuffer();
}

export const hollowCircle = (ctx: EditorRegisterCtx): (() => void) => ctx.register({
    title: "Hollow Circle",
    description: "Creates a hollow circle on the image.",
    index: 3,
    icon
}, cb);
