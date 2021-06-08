interface DBSchemaWatchlistPage {

    /**
     * The internal ID of this relation.
     */
    "pwl_id": number;
    /**
     * The internal ID of this page.
     */
    "pwl_page": number;
    /**
     * The internal ID of a watchlist where this page is attached to.
     */
    "pwl_watchlist": number;

}

export default DBSchemaWatchlistPage;