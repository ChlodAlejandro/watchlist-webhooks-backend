import AccessToken from "./AccessToken";
import WebRequestQueue from "../jobs/WebRequestQueue";
import WikimediaURL from "./WikimediaURL";
import WWBackend from "../WWBackend";

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
    ) : Promise<WatchlistEntry[]> {
        const queue = background ? WebRequestQueue.bg : WebRequestQueue.fg;

        let wrcontinue : string | false = null;
        const pages : WatchlistEntry[] = [];

        do {
            const response = await queue.enqueue(await token.upgradeRequest({
                url: WikimediaURL.actionApi(project),
                params: {
                    action: "query",
                    list: "watchlistraw",
                    wrlimit: "max",
                    wrcontinue: wrcontinue
                },
                responseType: "json"
            }));

            if (response.data["continue"]?.["wrcontinue"] != null)
                wrcontinue = response.data["continue"]["wrcontinue"];
            else
                wrcontinue = false;

            pages.push(...response.data["watchlistraw"]);
        } while (wrcontinue !== false);

        return pages;
    }

    /**
     * Updates all watchlists which need updating
     */
    async updateWatchlists() : Promise<void> {
        await WWBackend.database.useConnection(async (sql) => {
            // Get watchlists due for updating
            await sql.query(`
                SELECT *
                FROM \`watchlists\`
                    JOIN accounts on watchlists.wtl_account = accounts.acc_id
                WHERE \`wtl_update\` <= CURRENT_TIMESTAMP - INTERVAL \`wtl_interval\` SECOND
            `);

            
        });
    }

}