import express from "express";
import WikimediaRoute from "./WikimediaRoute";
import StaticRoutes from "./StaticRoutes";

/**
 * A Route handles a specific path or request.
 */
interface Route {

    path: string | RegExp | ((req : express.Request) => boolean);
    middleware: (
        req : express.Request,
        res: express.Response,
        next : express.NextFunction
    ) => Promise<void> | void;

}
export default Route;

/**
 * A list of available routes.
 */
export const Routes : Route[] = [
    WikimediaRoute,
    ...StaticRoutes
];

/**
 * Finds the correct route for a path and returns it.
 *
 * @param req The Express request.
 */
export function findRoute(req : express.Request) : Route {
    for (const route of Routes) {
        if (
            (typeof route.path === "string" && req.path.startsWith(route.path))
            || (route.path instanceof RegExp && route.path.test(req.path))
            || (typeof route.path === "function" && route.path(req))
        )
            return route;
    }
}