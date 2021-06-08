interface DBSchemaWatchlist {

    /**
     * The internal ID of this watchlist record.
     */
    "wtl_id": number;
    /**
     * This user's account number on Wikipedia.
     */
    "wtl_account": number;
    /**
     * The database name (e.g. enwiki) to which this watchlist belongs in.
     */
    "wtl_wiki": string;
    /**
     * The time to wait (in minutes) until re-querying the watchlist.
     */
    "wtl_interval": number;
    /**
     * The last timestamp that this watchlist updated (either manually or automatically).
     */
    "wtl_update": Date;
    /**
     * The last timestamp that this watchlist was manually updated.
     */
    "wtl_update_manual": Date;
    /**
     * An MD5 hash of this watchlist's JSON representation.
     *
     * e.g. For a watchlist with the items "A" and "B", this will be the MD5 hash of
     * the string `["A","B"]`, which is 77e9dc61cb9404525a07bd5421bf799d.
     */
    "wtl_hash": Buffer;

}

export default DBSchemaWatchlist;