/**
 * Time utilities.
 */
export class TimeUtils {

    /**
     * Gets the date and time as a human-readable string.
     */
    static datetime(date? : Date) : string {
        return (date ?? new Date()).toISOString().replace(/[TZ]/g, " ");
    }

}