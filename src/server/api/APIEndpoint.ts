import {RequestHandler} from "express-serve-static-core";
import express from "express";

/**
 * An APIEndpoint represents an Express-compatible endpoint for a given path.
 * The path is always represented by the "path" variable.
 */
export default abstract class APIEndpoint {

    abstract name : string;
    abstract description : string;
    abstract path : string;

    abstract all?: RequestHandler;
    abstract get?: RequestHandler;
    abstract post?: RequestHandler;
    abstract put?: RequestHandler;
    abstract delete?: RequestHandler;
    abstract patch?: RequestHandler;
    abstract options?: RequestHandler;
    abstract head?: RequestHandler;

    /**
     * Registers the endpoint with the given router.
     *
     * @param router The router or application to use.
     */
    register(router : express.Router) : void {
        if (this.all)
            router.all(this.path, this.all);
        if (this.get)
            router.get(this.path, this.get);
        if (this.post)
            router.post(this.path, this.post);
        if (this.put)
            router.put(this.path, this.put);
        if (this.delete)
            router.delete(this.path, this.delete);
        if (this.patch)
            router.patch(this.path, this.patch);
        if (this.options)
            router.options(this.path, this.options);
        if (this.head)
            router.head(this.path, this.head);
    }

}