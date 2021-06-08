import mysql from "mysql2/promise";
import WWBackend from "../WWBackend";
import PromiseUtils from "../util/PromiseUtils";

interface DatabaseConnection {
    /** The index of this connection. */
    index: number;
    /** Whether or not this connection is currently in use. */
    inUse: boolean;
    /** The last time this connection was closed. */
    lastUse: number;
    /** The SQL connection. */
    sql: mysql.Connection;
}

/**
 * Handles database connections.
 */
export default class Database {

    /**
     * The maximum time that a connection will be held open for further requests.
     * @private
     */
    private static readonly connectionIdle = 2000;

    /**
     * The maximum amount of connections that can be allowed simultaneously.
     * @private
     */
    private static readonly connectionLimit = 3;

    /**
     * The connection pool to the SQL server
     *
     * In compliance with Wikimedia's guidelines for using Toolforge, this variable,
     * in reality, does not actually create a pool with persistent connections. It
     * only serves as a way to be able to have multiple simultaneous SQL connections
     * which get closed if unused for a set amount of time (see {@link connectionIdle}).
     * @private
     */
    private connectionPool : Record<number, DatabaseConnection> = (() => {
        const pool : Record<number, DatabaseConnection> = {};

        for (let i = 0; i < Database.connectionLimit; i++)
            pool[i] = { index: i, inUse: false, lastUse: 0, sql: null };

        return pool;
    })();

    /**
     * Create a Database object.
     */
    constructor() {
        // Automatically destroy old connections.
        setInterval(() => {
            const now = Date.now();
            // Time is of the essence, so let's not use Object.entries.
            for (let i = 0; i < Database.connectionLimit; i++) {
                const connection = this.connectionPool[i];
                if (!connection.inUse && now - connection.lastUse > Database.connectionIdle) {
                    this.close(i);
                }
            }
        }, 20);
    }

    /**
     * Creates an SQL connection.
     */
    async connect(): Promise<mysql.Connection> {
        WWBackend.log.debug("Creating database connection...");
        return mysql.createConnection({
            host: process.env["WMWW_SQL_HOSTNAME"],
            port: +(process.env["WMWW_SQL_PORT"]) ?? 3306,
            user: process.env["WMWW_SQL_USERNAME"],
            password: process.env["WMWW_SQL_PASSWORD"],
            database: process.env["WMWW_SQL_DATABASE"],
        });
    }

    /**
     * Gets an SQL connection for use. If the connection limit hasn't been reached,
     * a new connection will be created if other connections are in use. If the
     * connection limit has been reached, a connection has to be released before a
     * new one can be created.
     */
    async use() : Promise<DatabaseConnection> {
        const startTime = Date.now();

        do {
            for (const conn of Object.values(this.connectionPool)) {
                if (conn.inUse)
                    continue;

                // This connection isn't in use. Lock it immediately.
                conn.inUse = true;

                if (conn.sql == null) {
                    // This connection has already been closed. Reconnect.
                    conn.sql = await this.connect();
                }

                // Give out the connection.
                return conn;
            }

            // Try again later if all connections are in use.
            await PromiseUtils.sleep(10);
        } while (Date.now() - startTime < 360000); // Give up after 6 minutes

        throw new Error("Timed out waiting for a database connection.");
    }

    /**
     * Releases a connection for eventual disconnection or reuse.
     * @param index The index of the connection.
     */
    release(index : number) : void {
        const connection = this.connectionPool[index];

        connection.inUse = false;
        connection.lastUse = Date.now();
    }

    /**
     * Completely closes and destroys a connection.
     * @param index The index of the connection.
     */
    close(index : number) : void {
        const connection = this.connectionPool[index];

        if (connection.sql != null) {
            WWBackend.log.info("Disconnecting from database...");
            connection.sql.destroy();
            connection.sql = null;
        }
    }

    /**
     * Completely closes and destroys all connections.
     */
    closeAll() : void {
        for (const index of Object.keys(this.connectionPool)) {
            const connection = this.connectionPool[index];

            if (connection != null && connection.sql != null) {
                WWBackend.log.info("Disconnecting from database...");
                connection.sql.destroy();
                connection.sql = null;
            }
        }
    }

    /**
     * Connect to the database and perform queries.
     * @param callback A function which uses the borrowed connection.
     */
    async useConnection(
        callback : (connection : mysql.Connection) => Promise<any> | any
    ) : Promise<void> {
        const connection = await this.use();
        await callback(connection.sql);
        await this.release(connection.index);
    }

}