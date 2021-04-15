import axios, {AxiosRequestConfig, AxiosResponse} from "axios";
import WWBackend from "../WWBackend";
import PromiseUtils, {ExposedPromise} from "../util/PromiseUtils";
import RateLimiter from "./RateLimiter";

/** Maximum amount of queues */
const QUEUE_LIMIT = 3;

/**
 * The state of the web request queue.
 */
export enum WebRequestQueueState {
    Inactive,
    Paused,
    Active
}

/**
 * A single queue which contains request and promise information.
 */
type Queue = {
    processing: boolean,
    state: WebRequestQueueState,
    requests: {
        request: AxiosRequestConfig,
        promise: ExposedPromise<AxiosResponse>
    }[];
};

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
    /** This queue's request queues. */
    private queues : Queue[] = (() => {
        // Automatically generate queues.
        const queues = [];
        for (let i = 0; i < QUEUE_LIMIT; i++)
            queues.push(
                {
                    processing: false,
                    state: WebRequestQueueState.Inactive,
                    requests: []
                }
            );
        return queues;
    })();
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
     * Throws an error if the given queue ID is out of range.
     * @param queueIndex The index of the queue.
     */
    assertQueue(queueIndex : number) : void {
        if (queueIndex >= QUEUE_LIMIT || this.queues[queueIndex] == null)
            throw new RangeError("Queue index out of bounds.");
    }

    /**
     * Finds the index of the smallest queue.
     */
    smallestQueueIndex() : number {
        let currentIndex = 0;
        for (
            let i = 0;
            i < Math.max(
                ...Object.keys(this.queues)
                    .map(v => isNaN(+(v)) ? Infinity : +(v))
            );
            i++
        ) {
            if (
                this.queues[i].requests.length
                < this.queues[currentIndex].requests.length
            ) {
                currentIndex = i;
            }
        }
        return currentIndex;
    }

    /**
     * Empties out the queue by processing everything.
     * @param queueIndex Which queue to process from
     */
    async process(queueIndex : number) : Promise<void> {
        this.assertQueue(queueIndex);
        // In order to get the pointer instead of the object.
        const q = () => { return this.queues[queueIndex]; };

        if (q().processing) return;
        if (q().state === WebRequestQueueState.Paused)
            return WWBackend.log.warn(
                `An attempt was made to process a paused queue (${this.name}).`
            );

        q().processing = true;
        q().state = WebRequestQueueState.Active;

        // Wrap in async function in order to avoid assumption that state is
        // always Active.
        await (async () => {
            // Using a while loop instead of a for loop will continuously empty out
            // the queue until it becomes empty, even if the queue happens to gain
            // an element.
            while (q().requests.length > 0) {
                if (q().state === WebRequestQueueState.Paused)
                    await PromiseUtils.wait(() => q().state !== WebRequestQueueState.Paused);

                const { request, promise } = q().requests.shift();

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
        q().state = WebRequestQueueState.Inactive;
        q().processing = false;
    }

    /**
     * Enqueues a web request.
     * @param config The configuration for this request.
     */
    async enqueue(
        config : AxiosRequestConfig
    ) : Promise<AxiosResponse> {
        const promiseElements = PromiseUtils.build<AxiosResponse>();

        const queueIndex = this.smallestQueueIndex();

        this.queues[queueIndex].requests.push({
            request: config,
            promise: promiseElements
        });

        if (this.queues[queueIndex].requests.length > 50) {
            WWBackend.log.warn("The queue is heavily backlogged. Something must be wrong.");
        }

        if (this.queues[queueIndex].state === WebRequestQueueState.Inactive
            && !this.queues[queueIndex].processing) {
            // noinspection ES6MissingAwait
            this.process(queueIndex);
        }

        return promiseElements.promise;
    }

    /**
     * Pauses this queue from processing.
     * @param queueIndex The index of the queue to process.
     */
    pause(queueIndex : number) : void {
        this.assertQueue(queueIndex);
        this.queues[queueIndex].state = WebRequestQueueState.Paused;
    }

    /**
     * Unpauses this queue from processing.
     * @param queueIndex The index of the queue to process.
     */
    unpause(queueIndex : number) : void {
        this.assertQueue(queueIndex);
        this.queues[queueIndex].state = this.queues[queueIndex].processing ?
            WebRequestQueueState.Active : WebRequestQueueState.Inactive;
    }

}