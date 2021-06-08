interface DBSchemaPage {

    /**
     * The internal ID of this page. The following pseudocode constructs
     * this ID:
     *
     * ```
     * sha1(wiki + ":" + namespace + ":" + page title) => base64-encoded string
     * ```
     */
    "pge_id": string;
    /**
     * The database name (e.g. enwiki) to which this page belongs in.
     */
    "pge_wiki": number;
    /**
     * The namespace number of this page.
     */
    "pge_namespace": number;
    /**
     * The title of this page.
     */
    "pge_page": Buffer;

}

export default DBSchemaPage;