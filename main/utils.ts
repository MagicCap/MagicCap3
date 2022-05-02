export function flatPromise<T>(): [(arg: T) => void, Promise<T>] {
    let resolve: (arg: T) => void;
    const promise = new Promise<T>(res => {
        resolve = res;
    });
    return [(arg: T) => resolve(arg), promise];
}
