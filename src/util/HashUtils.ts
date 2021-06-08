import crypto, {BinaryLike, BinaryToTextEncoding} from "crypto";

/**
 * Hashing function utilities
 */
export default class HashUtils {

    /**
     * Generate a SHA-1 hash of an object.
     *
     * @param object The object to hash with.
     */
    static sha1(
        object : BinaryLike | Buffer
    ) : Buffer;
    /**
     * Generate a SHA-1 hash of an object.
     *
     * @param object The object to hash with.
     * @param outputFormat The output format (a {@link Buffer} by default).
     */
    static sha1(
        object : BinaryLike | Buffer,
        outputFormat : BinaryToTextEncoding
    ) : string;
    /**
     * Generate a SHA-1 hash of an object.
     *
     * @param object The object to hash with.
     * @param outputFormat The output format (a {@link Buffer} by default).
     */
    static sha1(
        object : BinaryLike | Buffer,
        outputFormat? : BinaryToTextEncoding
    ) : Buffer | string {
        const sum = crypto.createHash("sha1");
        sum.update(object);

        return sum.digest(outputFormat);
    }

}