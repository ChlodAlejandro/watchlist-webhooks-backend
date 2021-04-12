import express from "express";

/**
 * URL utilities for easy URL handling.
 */
export default class URLUtils {

    /**
     * Gets the root path URL (path at `/`) with a trailing slash.
     * @param req The Express request.
     */
    static rootURL(req : express.Request) : string {
        return `${req.protocol}://${req.get("host")}/`;
    }

    /**
     * Get the full URL from an Express response
     * @param req The Express request.
     */
    static fullURL(req : express.Request) : string {
        return `${req.protocol}://${req.get("host")}${req.originalUrl}`;
    }

}