/**
 * The current state of a clock.
 */
enum ClockState {
    Stopped,
    Started
}

/**
 * A clock periodically performs repeated tasks. Unlike intervals, a clock
 * can be paused at any moment in order to make way for other actions.
 */
export default class Clock {

    /** The current state of this clock. */
    private _state : ClockState = ClockState.Started;

    /** The current state of this clock. */
    public get state() : ClockState {
        return this._state;
    }

    /** Set the clock state. */
    public set state(value : ClockState) {
        this._state = value;

        if (value === ClockState.Started) {
            this.start();
        } else if (value === ClockState.Stopped) {
            this.stop();
        }
    }

    /** Native Node.js interval */
    private _interval : NodeJS.Timeout;

    /**
     * Creates a new Clock.
     *
     * @param callback The function to be periodically called.
     * @param interval The interval at which the function will be called.
     * @param runImmediately Whether or not the callback will be run on clock startup.
     * @param startPaused Whether or not the clock starts paused.
     */
    constructor(
        private callback : (...args : any[]) => any,
        private interval : number,
        runImmediately = false,
        startPaused = false
    ) {
        if (startPaused)
            this.state = ClockState.Stopped;
        else {
            if (runImmediately)
                callback();
            this.start();
        }
    }

    /**
     * Stops the clock.
     */
    stop() : void {
        clearInterval(this._interval);
    }

    /**
     * Starts the clock.
     */
    start(callAtStart = false) : void {
        if (callAtStart)
            this.callback();

        this._interval = setInterval(this.callback, this.interval);
    }

}