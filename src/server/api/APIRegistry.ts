import express from "express";

/**
 * Register the API-related routes.
 */
export default async function getAPIRouter() : Promise<express.Router> {
    const router = express.Router({ caseSensitive: false, mergeParams: true } );

    router.get("/api/v1/wikimedia/auth", (await import("./v1/wikimedia/auth")).default);
    // TODO: Remove this when published on Toolforge
    router.get("/wikimedia", (await import("./v1/wikimedia/auth")).default);
    return router;

}