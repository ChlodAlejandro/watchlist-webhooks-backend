import AccessToken from "./AccessToken";
import WebRequestQueue from "../jobs/WebRequestQueue";
import WikimediaURL from "./WikimediaURL";
import WWBackend from "../WWBackend";
import mysql, {FieldPacket} from "mysql2/promise";
import Clock from "../util/Clock";
import NamespaceManager from "./NamespaceManager";
import DBSchemaWatchlist from "../database/schema/Watchlist";
import DBSchemaAccount from "../database/schema/Account";
import DBSchemaWatchlistPage from "../database/schema/WatchlistPage";
import DBSchemaPage from "../database/schema/Pages";
import DataUtils from "../util/DataUtils";

/**
 * Represents a single entry on user's
 */
interface WatchlistEntry {
    ns: number;
    title: string;
}

/**
 * Handles all watchlist operations.
 */
export default class WatchlistManager {

    /**
     * The update clock for this object.
     */
    updateClock = new Clock(async () => {
        const start = Date.now();
        // await this.updateWatchlists();
        const length = Date.now() - start;

        WWBackend.log.trace(`Watchlist updates took ${length}ms`);
        if (length > 30000)
            WWBackend.log.warn(
                `Watchlist updates took ${(length / 1000).toFixed(3)} seconds.`
            );
    }, 60000, true);

    /**
     * Grabs a user's entire watchlist. Background task by default.
     *
     * This should only be a foreground task if the user specifically requests an update.
     * @param token The access token of the user.
     * @param project The project database name (e.g. `enwiki`)
     * @param background Whether or not this request should be queued in the background queue.
     */
    async pullWatchlist(
        token : AccessToken,
        project : string,
        background = true
    ) : Promise<Set<WatchlistEntry>> {
        const queue = background ? WebRequestQueue.bg : WebRequestQueue.fg;

        // Get only the subject namespace pages.
        const subjectNamespaces = await NamespaceManager.getSubjectNamespaces(project);
        const subjectNamespaceIDs = Object.keys(subjectNamespaces);

        let wrcontinue : string | false = null;
        const pages = new Set<WatchlistEntry>();

        do {
            const response = await queue.enqueue(await token.upgradeRequest({
                url: WikimediaURL.actionApi(project),
                params: {
                    action: "query",
                    list: "watchlistraw",
                    wrlimit: "max",
                    wrnamespace: subjectNamespaceIDs.join("|"),
                    wrcontinue: wrcontinue
                },
                responseType: "json"
            }));

            if (response.data["continue"]?.["wrcontinue"] != null)
                wrcontinue = response.data["continue"]["wrcontinue"];
            else
                wrcontinue = false;

            for (const object of response.data["watchlistraw"])
                pages.add(object);
        } while (wrcontinue !== false);

        return pages;
    }

    /**
     * Loads a user's entire watchlist from the SQL database.
     *
     * @param watchlist The watchlist to get information from.
     */
    async loadWatchlist(
        watchlist : DBSchemaWatchlist
    ) : Promise<Set<WatchlistEntry>> {
        return WWBackend.database.useConnection(async (sql) => {
            // Load from SQL
            const watchlistQuery = await sql.query<mysql.RowDataPacket[]>(`
                SELECT *
                FROM \`pages_userwatchlists\`
                    JOIN \`pages\` ON \`pwl_page\` = \`pge_id\`
                WHERE \`pwl_watchlist\` = ?
            `, [ watchlist.wtl_id ]);

            const pages = new Set<WatchlistEntry>();
            for (const page of <(DBSchemaWatchlistPage & DBSchemaPage)[]> watchlistQuery[0]) {
                pages.add({
                    ns: page.pge_namespace,
                    title: page.pge_page.toString("utf8")
                });
            }

            return pages;
        });
    }

    /**
     * Updates a single (existing) watchlist.
     */
    async updateWatchlist(
        watchlist : DBSchemaWatchlist & DBSchemaAccount,
        manual = false
    ) : Promise<void> {
        // Download the old watchlist
        const oldEntries = await this.loadWatchlist(watchlist);

        // Download the new watchlist
        const newEntries = await this.pullWatchlist(
            AccessToken.fromDatabase(watchlist),
            watchlist.wtl_wiki
        );

        let removed =
            Array.from<WatchlistEntry>(oldEntries).filter(item => !newEntries.has(item));
        let added =
            Array.from<WatchlistEntry>(newEntries).filter(item => !oldEntries.has(item));

        WWBackend.log.debug(`Found ${
            removed.length
        } pages to remove and ${
            added.length
        } pages to add.`);

        // Save it into the database.
        await WWBackend.database.useConnection(async (sql) => {
            await sql.beginTransaction();

            WWBackend.log.debug("Saving to database...");

            // DELETE removed pages.
            // Do NOT remove pages from the `pages` table.
            if (removed.length > 0) {
                // Do this in chunks of 1000.
                do {
                    const batch = removed.slice(0, removed.length > 1000 ? 1000 : removed.length);

                    WWBackend.log.debug(`Removing ${batch.length} pages...`);

                    await sql.execute(`
                        DELETE FROM \`pages_userwatchlists\`
                        WHERE 
                            pwl_watchlist = ? 
                            AND pwl_page IN (${ "?, ".repeat(batch.length).slice(0, -2) })
                    `, [ watchlist.wtl_id, ...batch.map(
                        page => DataUtils.getPageId(watchlist.wtl_wiki, page)
                    ) ]);

                    // Remove everything that was sliced by the batch.
                    removed = removed.slice(batch.length);

                    if (removed.length > 0)
                        WWBackend.log.debug(`${removed.length} left...`);
                } while (removed.length > 0);
            }

            if (added.length > 0) {
                do {
                    const batch = added.slice(0, added.length > 1000 ? 1000 : added.length);

                    WWBackend.log.debug(`Adding ${batch.length} pages...`);

                    // Inserted pages might not have records. Time to create them.
                    await sql.execute(`
                        INSERT IGNORE INTO \`pages\` (pge_id, pge_wiki, pge_namespace, pge_page) 
                        VALUES ${ "(?, ?, ?, ?), ".repeat(batch.length).slice(0, -2) }
                    `, batch.reduce((arr, page) => {
                        arr.push(
                            DataUtils.getPageId(watchlist.wtl_wiki, page),
                            watchlist.wtl_wiki,
                            page.ns,
                            page.title
                        );

                        return arr;
                    }, []));

                    // INSERT added pages.
                    await sql.execute(`
                        INSERT INTO \`pages_userwatchlists\` (pwl_page, pwl_watchlist) 
                        VALUES ${ "(?, ?), ".repeat(batch.length).slice(0, -2) }
                    `, batch.reduce((arr, page) => {
                        arr.push(
                            DataUtils.getPageId(watchlist.wtl_wiki, page),
                            watchlist.wtl_id
                        );

                        return arr;
                    }, []));

                    // Remove everything that was sliced by the batch.
                    added = added.slice(batch.length);
                    if (added.length > 0)
                        WWBackend.log.debug(`${added.length} left...`);
                } while (added.length > 0);
            }

            WWBackend.log.debug("Done. Saving watchlist entry details...");

            // Update the watchlist entry
            // if statement for the sake of linting.
            if (manual) {
                await sql.execute(
                    `
                        UPDATE watchlists_user
                        SET \`wtl_update\` = CURRENT_TIMESTAMP,
                            \`wtl_update_manual\` = CURRENT_TIMESTAMP
                        WHERE \`wtl_id\` = ?
                    `,
                    [ watchlist.wtl_id ]
                );
            } else {
                await sql.execute(
                    `
                        UPDATE watchlists_user
                        SET \`wtl_update\` = CURRENT_TIMESTAMP
                        WHERE \`wtl_id\` = ?
                    `,
                    [ watchlist.wtl_id ]
                );
            }

            await sql.commit();

            WWBackend.log.debug(`Updated watchlist ${watchlist.wtl_id}.`);
        });
    }

    /**
     * Updates all watchlists which need updating
     */
    async updateWatchlists() : Promise<void> {
        WWBackend.log.debug("Rechecking watchlists...");

        await WWBackend.database.useConnection(async (sql) => {
            // Get watchlists due for updating
            const [watchlists] : [unknown, FieldPacket[]] = await sql.execute(`
                SELECT *
                FROM \`watchlists_user\`
                    JOIN accounts on watchlists_user.wtl_account = accounts.acc_id
                WHERE \`wtl_update\` <= CURRENT_TIMESTAMP - INTERVAL \`wtl_interval\` SECOND
            `);

            const updatePromises = [];

            for (const watchlist of (watchlists as (DBSchemaWatchlist & DBSchemaAccount)[])) {
                WWBackend.log.trace(`Updating watchlist of ${watchlist.acc_id}...`);

                updatePromises.push(this.updateWatchlist(watchlist));
            }

            await Promise.all(updatePromises);
        });

        WWBackend.log.debug("Watchlists checked.");
    }

}