export default class Debouncer {
    private timeout: number;

    constructor() {
        this.timeout = -1;
    }

    debounce(action: () => void) {
        if (this.timeout !== -1) clearTimeout(this.timeout);
        // @ts-ignore
        this.timeout = setTimeout(() => {
            action();
            this.timeout = -1;
        }, 100);
    }
}
