import axios, {AxiosRequestConfig, AxiosResponse} from "axios";
import WWBackend from "../WWBackend";
import PromiseUtils, {ExposedPromise} from "../util/PromiseUtils";
import RateLimiter from "./RateLimiter";

/**
 * The state of the web request queue.
 */
export enum WebRequestQueueState {
    Inactive,
    Paused,
    Active
}

/**
 * This is a worker class responsible for dealing with a sequence of
 * web requests. This is an attempt at making sure that all Wikimedia
 * requests are done in succession instead of in parallel.
 *
 * Two queues exist: one for immediate requests (where a user requires
 * information immediately) and another for background requests (e.g.
 * watchlist updates).
 */
export default class WebRequestQueue {

    /** The background queue is for non-immediate requests. */
    private static backgroundQueue : WebRequestQueue;
    /** The foreground queue is for immediate requests. */
    private static foregroundQueue : WebRequestQueue;

    /** The background queue is for non-immediate requests. */
    public static get bg() : WebRequestQueue {
        return WebRequestQueue.backgroundQueue ??
            (WebRequestQueue.backgroundQueue = new WebRequestQueue("background"));
    }

    /** The foreground queue is for immediate requests. */
    public static get fg() : WebRequestQueue {
        return WebRequestQueue.foregroundQueue ??
            (WebRequestQueue.foregroundQueue = new WebRequestQueue("foreground"));
    }

    // O(1) time complexity? What's that?
    /** This queue's request queue. */
    private queue : {request: AxiosRequestConfig, promise: ExposedPromise<AxiosResponse>}[];
    /** The status of this web request queue. */
    private state : WebRequestQueueState;
    /** Whether or not a processor is already running. */
    private processing : boolean;
    /** Rate limiting information */
    private rateLimit : RateLimiter = new RateLimiter(1000, 200);

    /**
     * Creates a new WebRequestQueue.
     * @param name The name of this queue.
     */
    private constructor(
        /**
         * The name of this queue.
         */
        public readonly name : string
    ) {}

    /**
     * Empties out the queue by processing everything.
     */
    async process() : Promise<void> {
        if (this.processing) return;
        if (this.state === WebRequestQueueState.Paused)
            return WWBackend.log.warn(
                `An attempt was made to process a paused queue (${this.name}).`
            );

        this.processing = true;
        this.state = WebRequestQueueState.Active;

        // Wrap in async function in order to avoid assumption that state is
        // always Active.
        await (async () => {
            // Using a while loop instead of a for loop will continuously empty out
            // the queue until it becomes empty, even if the queue happens to gain
            // an element.
            while (this.queue.length > 0) {
                if (this.state === WebRequestQueueState.Paused)
                    await PromiseUtils.wait(() => this.state !== WebRequestQueueState.Paused);

                const { request, promise } = this.queue.shift();

                try {
                    // This await is VERY important!
                    const requestResponse = await axios(request);
                    promise.resolver(requestResponse);

                    this.rateLimit.increment();
                } catch (e) {
                    promise.rejector(e);
                }

                if (!this.rateLimit.clear)
                    await this.rateLimit.waitUntilClear();
            }
        })();

        // Queue is empty!
        this.state = WebRequestQueueState.Inactive;
        this.processing = false;
    }

    /**
     * Enqueues a web request.
     * @param config The configuration for this request.
     */
    async enqueue(
        config : AxiosRequestConfig
    ) : Promise<AxiosResponse> {
        const promiseElements = PromiseUtils.build<AxiosResponse>();

        this.queue.push({
            request: config,
            promise: promiseElements
        });

        if (this.queue.length > 50) {
            WWBackend.log.warn("The queue is heavily backlogged. Something must be wrong.");
        }

        if (this.state === WebRequestQueueState.Inactive && !this.processing) {
            // noinspection ES6MissingAwait
            this.process();
        }

        return promiseElements.promise;
    }

    /**
     * Pauses this queue from processing.
     */
    pause() : void {
        this.state = WebRequestQueueState.Paused;
    }

    /**
     * Unpauses this queue from processing.
     */
    unpause() : void {
        this.state = this.processing ? WebRequestQueueState.Active : WebRequestQueueState.Inactive;
    }

}