import mysql from "mysql2/promise";
import WWBackend from "../WWBackend";

/**
 * Handles database connections.
 */
export default class Database {

    /**
     * The connection pool to the SQL server
     * @private
     */
    private connection : mysql.Connection;

    /**
     * Opens the SQL server connection.
     */
    async open() : Promise<mysql.Connection> {
        if (this.connection == null) {
            WWBackend.log.info("Connecting to database...");
            this.connection = await mysql.createConnection({
                host: process.env["WMWW_SQL_HOSTNAME"],
                port: +(process.env["WMWW_SQL_PORT"]) ?? 3306,
                user: process.env["WMWW_SQL_USERNAME"],
                password: process.env["WMWW_SQL_PASSWORD"],
                database: process.env["WMWW_SQL_DATABASE"],
            });
        }
        return this.connection;
    }

    /**
     * Closes the connection and nullifies {@link connection}.
     */
    close() : void {
        if (this.connection != null) {
            WWBackend.log.info("Disconnecting from database...");
            this.connection.destroy();
            this.connection = null;
        }
    }

    /**
     * Connect to the database and perform queries.
     * @param callback A function which uses the borrowed connection.
     */
    async useConnection(callback : (connection : mysql.Connection) => any) : Promise<void> {
        const connection = await this.open();
        await callback(connection);
        await this.close();
    }

}