export default (filename: string, content: string) => {
    const a = document.createElement("a");
    a.setAttribute("href", "data:text/plain;charset=utf-8," + encodeURIComponent(content));
    a.setAttribute("download", filename);
    const event = document.createEvent("MouseEvents");
    event.initEvent("click", true, true);
    a.dispatchEvent(event);
    a.remove();
};
