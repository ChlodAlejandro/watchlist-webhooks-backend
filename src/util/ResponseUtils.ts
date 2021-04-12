import express from "express";

/**
 * Express response utilities.
 */
export default class ResponseUtils {

    /**
     * Grabs an Express response, sets the appropriate status code and
     * sends the error description.
     * @param res The Express response.
     * @param error The error that occurred.
     */
    static resJsonError(res : express.Response, error: Error) : void;
    /**
     *
     * Grabs an Express response, sets the appropriate status code and
     * sends the error description.
     * @param res The Express response.
     * @param code The error code.
     * @param message The error message.
     */
    static resJsonError(res : express.Response, code: number, message: string) : void;
    /**
     *
     * Grabs an Express response, sets the appropriate status code and
     * sends the error description.
     * @param res The Express response.
     * @param a1 The first argument. Can either be the response code or an Error object.
     * @param a2 The second argument. Can only be a string, and is only used if the first
     *           argument is a number.
     */
    static resJsonError(res : express.Response, a1 : number | Error, a2? : string) : void {
        if (a1 instanceof Error) {
            res
                .status(500)
                .set("Content-Type", "application/json")
                .send(
                    JSON.stringify({"error": true, "error_message": a1.message})
                );
        } else {
            res
                .status(a1)
                .set("Content-Type", "application/json")
                .send(
                    JSON.stringify({"error": true, "error_message": a2})
                );
        }
    }

    /**
     * Grabs an Express response, sets the given response code (or 200),
     * and sends the JSON response.
     * @param res
     * @param response
     * @param code
     */
    static resJson(res : express.Response, response: Record<string, any>, code? : number) : void {
        res
            .status(code ?? 200)
            .set("Content-Type", "application/json")
            .send(
                JSON.stringify(response)
            );
    }

}