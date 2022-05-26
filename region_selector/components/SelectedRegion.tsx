import React from "react";

type SelectedRegionProps = {
    selectionStart: {x: number; y: number} | null,
    imageUrl: string,
    cursorPos: {x: number; y: number},
    scale: number,
};

export default (props: SelectedRegionProps) => {
    // Ignore if there is no selection.
    if (!props.selectionStart) return <></>;

    // Define the un-scaled corners.
    const top = Math.min(props.cursorPos.y, props.selectionStart.y);
    const bottom = Math.max(props.cursorPos.y, props.selectionStart.y);
    const left = Math.min(props.cursorPos.x, props.selectionStart.x);
    const right = Math.max(props.cursorPos.x, props.selectionStart.x);

    // Defines the canvas ref.
    const canvasRef = React.useRef<HTMLCanvasElement>(null);

    // Defines the canvas context.
    let [canvasContext, setCanvasContext] = React.useState<CanvasRenderingContext2D>();

    // Defines the image.
    let [image, setImage] = React.useState<HTMLImageElement>();

    // Set the canvas image URL.
    const [canvasUrl, setCanvasUrl] = React.useState("");

    // Handle the effects.
    React.useEffect(() => {
        // Get/set the canvas context.
        if (!canvasContext) {
            canvasContext = canvasRef!.current!.getContext("2d", {alpha: false})!;
            canvasContext.imageSmoothingEnabled = false;
            setCanvasContext(canvasContext);
        }

        // Handle the event when everything is ready.
        const handle = () => {
            canvasContext!.drawImage(image!,
                left * props.scale, top * props.scale,
                (right - left) * props.scale, (bottom - top) * props.scale,
                0, 0, right - left, bottom - top);
            setCanvasUrl(canvasRef!.current!.toDataURL());
        };

        // Get/set the image.
        if (!image) {
            image = new Image();
            image.src = props.imageUrl;
            image.onload = handle;
            setImage(image);
            return;
        }

        // Check the image has loaded.
        if (!image.complete) return;

        // Call the handler.
        handle();
    }, [props.cursorPos, props.selectionStart, props.imageUrl]);

    // Return the canvas and renderer for it.
    return <>
        <canvas width={right - left} height={bottom - top} ref={canvasRef} style={{display: "none"}} />
        <span style={{
            backgroundImage: `url(${canvasUrl})`, backgroundRepeat: "no-repeat",
            position: "fixed", zIndex: 8,
            width: `${right - left}px`,
            height: `${bottom - top}px`,
            top: `${top}px`, left: `${left}px`,
            boxSizing: "border-box", boxShadow: "0 0 0 300vmax rgba(0, 0, 0, 0.4)",
        }} />
    </>;
};
