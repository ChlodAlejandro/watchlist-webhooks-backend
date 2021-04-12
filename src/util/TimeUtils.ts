/**
 * Time utilities.
 */
export class TimeUtils {

    /**
     * Gets the date and time as a human-readable string.
     */
    static datetime() : string {
        return (new Date()).toISOString().replace(/[TZ]/g, " ");
    }

}