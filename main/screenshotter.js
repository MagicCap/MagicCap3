import sharp from "sharp";

const libScreenshot = eval("require")(`${globalThis.__MAGICCAP_DIST_FOLDER__}/libscreenshot/Release/screenshot.node`).getScreenshotForBounds;
const libNotch = eval("require")(`${globalThis.__MAGICCAP_DIST_FOLDER__}/libnotch/Release/notch.node`).getNotchInfo;

class Screenshotter {
    async captureScreen(display) {
        console.log("display:", display);
        const thumbnailSize = Screenshotter.getThumbnailSize(display);
        thumbnailSize.channels = 4;
        const notch = libNotch(display.bounds.x, display.bounds.y);
        if (notch !== undefined) console.log("found notch info (pixel offset):", notch);
        return {
            image: await sharp(libScreenshot(display.bounds.x, display.bounds.y, thumbnailSize.width, thumbnailSize.height), {raw: thumbnailSize}).toFormat("png").toBuffer(),
            notch: notch || 0
        };
    }

    async captureScreens(displays) {
        return Promise.all(displays.map(display => this.captureScreen(display).then(x => x.image)));
    }

    static getThumbnailSize(display) {
        return {
            width: display.size.width * display.scaleFactor,
            height: display.size.height * display.scaleFactor
        };
    }
}

export default new Screenshotter();
