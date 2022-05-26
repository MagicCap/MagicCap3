import screenshotter from "./screenshotter";
import { screen } from "electron";
import sharp from "sharp";

// Capture all displays attached to this machine and return them stitched together.
export default async(): Promise<Buffer> => {
    // Get all displays.
    const displays = screen.getAllDisplays();

    // Get all screenshots.
    const screenshots = await screenshotter.captureScreens(displays);

    // Normalise the size.
    let lowestX = 0;
    let highestX = 0;
    let lowestY = 0;
    let highestY = 0;
    for (const d of displays) {
        if (d.bounds.x * d.scaleFactor < lowestX) lowestX = d.bounds.x * d.scaleFactor;
        if ((d.bounds.x + d.bounds.width) * d.scaleFactor > highestX) highestX = (d.bounds.x + d.bounds.width) * d.scaleFactor;
        if (d.bounds.y * d.scaleFactor < lowestY) lowestY = d.bounds.y * d.scaleFactor;
        if ((d.bounds.y + d.bounds.height) * d.scaleFactor > highestY) highestY = (d.bounds.y + d.bounds.height) * d.scaleFactor;
    }

    // Get the width and height.
    const width = (lowestX * -1) + highestX;
    const height = (lowestY * -1) + highestY;

    // Create the canvas.
    const canvas = sharp({
        create: {
            width, height, background: {r: 0, g: 0, b: 0, alpha: 1},
            channels: 4,
        },
    });

    // Add all the screenshots and return the sharp result.
    return canvas.composite(screenshots.map((buf, index) => {
        const d = displays[index];
        const x = (lowestX * -1) + d.bounds.x;
        const y = (lowestY * -1) + d.bounds.y;
        return {
            input: buf,
            left: x,
            top: y,
        };
    })).toFormat("png").toBuffer();
};
