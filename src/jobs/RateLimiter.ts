/**
 * Aids in rate limiting requests.
 */
import PromiseUtils from "../util/PromiseUtils";

/**
 * Handles rate limiting.
 */
export default class RateLimiter {

    /** The timestamp of the start of this window. */
    private lastWindow : number;
    /** The number of actions performed in that timestamp. */
    private count : number;
    /** The interval responsible for this rate limiter. */
    private interval : NodeJS.Timeout;

    /**
     * Create a new rate limiter. As much as possible, destroy this object
     * by running {@link destroy()} when you stop using it.
     * @param duration How long the rate limiter should count.
     * @param limit The maximum amount of actions for a given window of time.
     */
    constructor(readonly duration : number, readonly limit : number) {
        const baseTime = Date.now();
        this.lastWindow = baseTime - (baseTime % duration);

        this.interval = setInterval(async () => {
            const currentWindow = baseTime - (baseTime % duration);

            if (currentWindow !== this.lastWindow) {
                this.count = 0;
                this.lastWindow = currentWindow;
            }
        }, 1);
    }

    /**
     * Whether or not this rate limiter has been tripped.
     */
    public get clear() : boolean {
        return this.count >= this.limit;
    }

    /**
     * Increment the rate limiter count by one.
     */
    public increment() : number {
        return ++this.count;
    }

    /**
     * Returns a promise that resolves when a tripped rate limiter's
     * window passes.
     */
    async waitUntilClear() : Promise<void> {
        return PromiseUtils.sleep(this.duration - (this.lastWindow % this.duration));
    }

}