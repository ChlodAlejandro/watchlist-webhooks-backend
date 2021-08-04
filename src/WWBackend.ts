import Logger from "bunyan";
import axios from "axios";
import BunyanFormat from "bunyan-format";
import Database from "./database/Database";
import EnvironmentUtils from "./util/EnvironmentUtils";
import {TimeUtils} from "./util/TimeUtils";
import StringUtils from "./util/StringUtils";
import WWHTTPServer from "./server/WWHTTPServer";

import packageLock from "../package-lock.json";
import WikimediaURL from "./wikimedia/WikimediaURL";
import WatchlistManager from "./wikimedia/WatchlistManager";
import * as util from "util";
import path from "path";

/**
 * HTTP and WSS server for Watchlist Webhooks.
 */
export default class WWBackend {

    /**
     * The root directory. The "src" folder should be here.
     */
    public static readonly ROOT_DIRECTORY = path.resolve(__dirname, "..");
    /**
     * The source directory. The "common" and "frontend" folders should be here.
     */
    public static readonly SOURCE_DIRECTORY = path.resolve(__dirname);

    /** This singleton handles the only instance of the WW backend server. */
    private static _singleton : WWBackend;
    /** The logger for this WW instance. */
    private log : Logger;
    /** This database for this WW instance. */
    private database : Database;
    /** The server for this WW instance. */
    private webserver : WWHTTPServer;
    /** The watchlist manager for all watchlists. */
    private watchlistManager : WatchlistManager;

    /** The logger for the WWBackend. */
    public static get log() : Logger {
        return WWBackend._singleton.log;
    }
    /** The database for the WWBackend. */
    public static get database() : Database {
        return WWBackend._singleton.database;
    }
    /** The only instance of the WWBackend. */
    public static get i() : WWBackend {
        return WWBackend._singleton ?? (WWBackend._singleton = new WWBackend());
    }

    /**
     * Creates the WatchList Webhooks server.
     */
    constructor() {
        if (WWBackend._singleton != null)
            throw new Error("Attempted to start another WatchlistWebhooks instance!");

        this.log = Logger.createLogger({
            name: "WWS",
            stream: BunyanFormat({
                outputMode: "short",
                levelInString: true,
            }, process.stdout),
            src: true,
            level: process.env["NODE_ENV"] === "production" ? "info" : "trace"
        });
    }

    /**
     * Starts the server.
     */
    async start() : Promise<void> {
        this.log.info("Starting WatchlistWebhooks server at " + TimeUtils.datetime());

        if (process.env.NODE_ENV === "development") {
            // Expose WWBackend in debugger console.
            (global as any).WWBackend = this;
        }

        this.log.info("Checking environment variables...");
        {
            const environment = EnvironmentUtils.checkEnvironment();
            if (environment) {
                this.log.fatal("Environment variables are missing. Cannot proceed.");
                this.log.fatal("Missing variables: " + StringUtils.enumerateArray(environment));
                return;
            }
        }

        this.log.info("Configuring libraries...");

        if (process.env.NODE_ENV === "development") {
            axios.interceptors.request.use((config) => {
                WWBackend.log.trace(
                    `${config.method.toUpperCase()} ${config.url}`,
                    ...[
                        ...(config.method.toLowerCase() === "get" ?
                            [config.data, config.params] : [config.params]),
                    ]
                );

                return config;
            });

            axios.interceptors.response.use((response) => {
                const config = response.request;
                WWBackend.log.trace(
                    `RESPONSE ${config.method.toUpperCase()} ${config.url}`,
                    util.inspect(response.data, { colors: true, maxArrayLength: 10 })
                );

                return response;
            });
        }

        axios.interceptors.request.use((config) => {
            config.headers["User-Agent"] = `WatchlistWebhooks/${
                packageLock.version
            } (https://watchlist-webhooks.toolforge.org; wiki@chlod.net) axios/${
                packageLock.dependencies["axios"].version
            }`;

            if (config.url.includes("/w/api.php")) {
                if (config.params != null) {
                    config.params.format = "json";
                    config.params.formatversion = "2";
                }
            }

            return config;
        });

        this.log.info("Building Wikimedia caches...");
        await WikimediaURL.buildCache();

        try {
            this.database = new Database();

            this.log.info("Starting web server...");
            this.webserver = new WWHTTPServer();
            await this.webserver.start();

            this.log.info("Starting the watchlist manager...");
            this.watchlistManager = new WatchlistManager();
        } catch (e) {
            this.log.fatal("Failed to properly start WW server.", e);
        }
    }

    /**
     * Stops the server.
     */
    async stop() : Promise<void> {
        this.log.info("Shutting down WatchlistWebhooks server at " + TimeUtils.datetime());

        if (this.database != null) {
            this.database.closeAll();
            this.log.info("Active database connections closed.");
        }

        this.log.info("============================================================");
        this.log.info("                   BACKEND SERVER STOPPED                   ");
        this.log.info("============================================================");
        process.exit();
    }

}

(async () => {
    await WWBackend.i.start();
})();

process.once("SIGINT", function () {
    WWBackend.log.info("SIGINT received. Shutting down...");
    WWBackend.i.stop();
});

process.once("SIGTERM", function () {
    WWBackend.log.info("SIGTERM received. Shutting down...");
    WWBackend.i.stop();
});