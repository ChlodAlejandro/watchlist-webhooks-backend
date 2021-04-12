/**
 * Represents a promise with an exposed resolver and rejector.
 */
export interface ExposedPromise<T> {
    promise: Promise<T>;
    resolver: (result : T) => any;
    rejector: (error : Error | any) => any;
}

/**
 * Promise utilities
 */
export default class PromiseUtils {

    /**
     * Creates a promise and exposes its resolver and rejector.
     */
    static build<T>() : ExposedPromise<T> {
        let resolver, rejector;
        const promise = new Promise<T>((res, rej) => {
            resolver = res;
            rejector = rej;
        });
        return {
            promise: promise,
            resolver: resolver,
            rejector: rejector
        };
    }

    /**
     * Delays code execution by waiting for a timeout.
     * @param duration The duration to wait for, in milliseconds.
     */
    static async sleep(duration : number) : Promise<void> {
        return new Promise((res) => { setTimeout(res, duration); });
    }

    /**
     * Delays code execution until a function returns true.
     * @param check The checking function.
     * @param overhead The delay overhead in milliseconds.
     */
    static async wait(check : () => boolean, overhead = 5) : Promise<void> {
        while (!check()) {
            await PromiseUtils.sleep(overhead);
        }
    }

}