import React from "react";

type TooltipProps = {
    children: React.ReactNode;
    content: string;
};

export default ({children, content}: TooltipProps) => {
    // Get the ref.
    const ref = React.useRef(null);

    // Get the DOM.
    const [dom, setDom] = React.useState<HTMLElement | null>(null);
    React.useEffect(() => {
        return () => {
            if (dom) dom.remove();
        };
    }, []);

    // Defines the hover handler.
    const hoverHn = (hovering: boolean) => {
        const span = ref.current;
        // @ts-ignore
        const rect = span.getBoundingClientRect();
        if (hovering) {
            // If a DOM element exists, remove it but don't change the state yet.
            if (dom) dom.remove();

            // Make the DOM element.
            let left = rect.x - (content.length * 3) - 5;
            if (0 > left) left = 0;
            const d = document.createElement("div");
            d.style.position = "absolute";
            d.style.top = `${rect.y - rect.height - 37}px`;
            d.style.zIndex = "99999";
            d.style.left = `${left}px`;
            d.ariaHidden = "true";
            const p = document.createElement("p");
            p.innerText = content;
            p.style.padding = "5px";
            p.style.backgroundColor = "black";
            p.style.color = "white";
            p.style.fontFamily = "'Roboto', sans-serif";
            d.append(p);
            document.body.prepend(d);
            setDom(d);
        } else {
            // If the DOM element exists, kill it.
            if (dom) {
                dom.remove();
                setDom(null);
            }
        }
    };

    // Return the span.
    return <span aria-label={content} ref={ref} onMouseOver={() => hoverHn(true)} onMouseLeave={() => hoverHn(false)}>
        {children}
    </span>;
};
