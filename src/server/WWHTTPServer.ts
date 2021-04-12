import express from "express";
import cookieParser from "cookie-parser";
import * as http from "http";
import {findRoute} from "./routes/Route";
import WWBackend from "../WWBackend";
import ResponseUtils from "../util/ResponseUtils";
import path from "path";
/**
 * The HTTP server for Watchlist Webhooks.
 *
 * This server was not built with HTTPS support because it was
 * meant to run behind a proxy which automatically encrypts
 * communication between the user and the server.
 */
export default class WWHTTPServer {

    /** This server's Express instance. */
    private express : express.Express;
    /** This server's Express router. */
    private router : express.Router;
    /** This server's HTTP listener. */
    private httpListener : http.Server;

    /**
     * Setup the express server.
     */
    async setupExpress() : Promise<void> {
        this.express = express();

        this.express.use(express.json());
        this.express.use(express.urlencoded({ extended: true }));
        this.express.use(cookieParser());

        this.router = express.Router({ caseSensitive: true });

        this.router.use("/cookies", express.static(path.resolve(__dirname, "static", "cookies")));
        this.router.use("/error", express.static(path.resolve(__dirname, "static", "error")));
        this.router.use("/", express.static(path.resolve(__dirname, "static", "main")));

        this.router.all("*", async (req, res, next) => {
            WWBackend.log.trace("Incoming connection.");
            const route = findRoute(req);

            if (route == null)
                ResponseUtils.resJsonError(res, 404, `The path requested (${
                    req.path
                }) cannot be found.`);
            else {
                WWBackend.log.debug(`Found path: ${route.path}`);
                await route.middleware(req, res, next);
            }
        });

        this.express.use(this.router);
    }

    /**
     * Starts the HTTP server.
     */
    async start() : Promise<void> {
        await this.setupExpress();

        const port = process.env["WMWW_HTTP_PORT"] == null ?
            48272 : +(process.env["WMWW_HTTP_PORT"]);

        this.httpListener = http.createServer(this.express);
        this.httpListener.listen(
            port,
            process.env["WMWW_HTTP_HOSTNAME"] ?? "0.0.0.0",
            () => {
                WWBackend.log.info(`HTTP server listening on port ${port}.`);
            }
        );
    }

}