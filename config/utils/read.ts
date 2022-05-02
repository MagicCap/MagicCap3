export default (accept: string[], cb: (content: string) => void) => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = accept.join(",");
    const event = document.createEvent("MouseEvents");
    event.initEvent("click", true, true);
    input.dispatchEvent(event);
    input.onchange = e => {
        const files = (e.target as any).files as FileList;
        if (files.length === 1) {
            files[0].text().then(cb);
        }
        input.remove();
    };
};
