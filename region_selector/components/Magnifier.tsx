import React from "react";

type MagnifierProps = {
    displayBounds: {width: number, height: number, x: number, y: number},
    cursorPos: {x: number; y: number} | null;
    imageUrl: string;
    scale: number;
};

// TODO: grid

export default ({cursorPos, imageUrl, displayBounds, scale}: MagnifierProps) => {
    // If there's no cursor position, it's not on this screen.
    if (!cursorPos) return <></>;

    // Defines the ref for the canvas.
    const canvasRef = React.useRef<HTMLCanvasElement>(null);

    // Defines the canvas context.
    let [canvasContext, setCanvasContext] = React.useState<CanvasRenderingContext2D>();

    // Defines the image.
    let [image, setImage] = React.useState<HTMLImageElement>();

    // Handle canvas initialisation/motification.
    React.useEffect(() => {
        // Get/set the canvas context.
        if (!canvasContext) {
            canvasContext = canvasRef!.current!.getContext("2d", {alpha: false})!;
            canvasContext.imageSmoothingEnabled = false;
            setCanvasContext(canvasContext);
        }

        // Handle the event when everything is ready.
        const handle = () => {
            canvasContext!.fillStyle = "black";
            canvasContext!.fillRect(0, 0, canvasRef!.current!.width, canvasRef!.current!.height);
            canvasContext!.drawImage(image!, (cursorPos!.x * scale) - 16, (cursorPos!.y * scale) - 16, 32, 32, 0, 0, 320, 160);
        };

        // Get/set the image.
        if (!image) {
            image = new Image();
            image.src = imageUrl;
            image.onload = handle;
            setImage(image);
            return;
        }

        // Check the image has loaded.
        if (!image.complete) return;

        // Call the handler.
        handle();
    }, [cursorPos, imageUrl]);

    // Set the top corner.
    const top = cursorPos.y + 235 > displayBounds.height ? cursorPos.y - 235 : cursorPos.y + 12;
    const left = cursorPos.x - 172 > 0 ? cursorPos.x - 172 : cursorPos.x + 12;

    // Return the elements.
    return <span style={{position: "fixed", zIndex: 10, left, top}}>
        <canvas ref={canvasRef} style={{width: "160px", height: "160px", borderRadius: "50%"}}></canvas>
        <div style={{
            margin: "3px", paddingTop: "3px", paddingBottom: "3px",
            backgroundColor: "black", color: "white", textAlign: "center",
            borderRadius: "15%", fontFamily: "Arial"
        }}>
            <p>X: {cursorPos.x * scale} | Y: {cursorPos.y * scale}</p>
        </div>
    </span>;
};
