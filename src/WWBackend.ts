import Logger from "bunyan";
import BunyanFormat from "bunyan-format";
import Database from "./database/Database";
import EnvironmentUtils from "./util/EnvironmentUtils";
import {TimeUtils} from "./util/TimeUtils";
import StringUtils from "./util/StringUtils";
import WWHTTPServer from "./server/WWHTTPServer";

/**
 * HTTP and WSS server for Watchlist Webhooks.
 */
export default class WWBackend {

    /** This singleton handles the only instance of the WW backend server. */
    private static _singleton : WWBackend;
    /** The logger for this WW instance. */
    private log : Logger;
    /** This database for this WW instance. */
    private database : Database;
    /** The server for this WW instance. */
    private webserver : WWHTTPServer;

    /** The logger for the WWBackend. */
    public static get log() : Logger {
        return WWBackend._singleton.log;
    }
    /** The database for the WWBackend. */
    public static get database() : Database {
        return WWBackend._singleton.database;
    }

    /**
     * Creates the WatchList Webhooks server.
     */
    constructor() {
        if (WWBackend._singleton != null)
            throw new Error("Attempted to start another WatchlistWebhooks instance!");
        WWBackend._singleton = this;

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

        this.log.info("Checking environment variables...");
        {
            const environment = EnvironmentUtils.checkEnvironment();
            if (environment) {
                this.log.fatal("Environment variables are missing. Cannot proceed.");
                this.log.fatal("Missing variables: " + StringUtils.enumerateArray(environment));
                return;
            }
        }

        try {
            this.database = new Database();

            this.log.info("Starting web server...");
            this.webserver = new WWHTTPServer();
            await this.webserver.start();
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
            this.database.close();
        }
    }

}

(async () => {
    await (new WWBackend()).start();
})();