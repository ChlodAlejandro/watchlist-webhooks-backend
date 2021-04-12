/**
 * String utilities.
 */
export default class StringUtils {

    /**
     * Enumerates the list of an array as a string, with each element
     * wrapped in quotes.
     * @param array The array to enumerate.
     * @param delimiter The delimiter between each element.
     * @param wrapper What to wrap each element with.
     */
    static enumerateArray(array : any[], delimiter? : string, wrapper? : string) : string {
        return array
            .map(value => `${wrapper ?? "\""}${value}${wrapper ?? "\""}`)
            .join(delimiter ?? ", ");
    }

    /**
     * Generates a random string.
     * @param length The length of the string.
     * @param pool The characters to use in the string.
     */
    // noinspection SpellCheckingInspection
    static random(
        length : number,
        pool = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789"
    ) : string {
        let final = "";
        for (let i = 0; i < length; i++) {
            final += pool.charAt(Math.floor(Math.random() * pool.length));
        }
        return final;
    }

}