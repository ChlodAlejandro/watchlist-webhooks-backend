import DBSchemaPage from "../database/schema/Pages";
import HashUtils from "./HashUtils";

/**
 * Data utilities and functions.
 */
export default class DataUtils {

    /**
     * Get a page's internal ID using an existing `Page` object from the database.
     * @param page The returned database object.
     */
    static getPageId(page : DBSchemaPage) : string;
    /**
     * Get a page's internal ID from a wiki database name (i.e. enwiki) and API
     * page details.
     *
     * @param wiki The database name (e.g. enwiki) to which this page belongs in.
     * @param page The page details, as returned by the MediaWiki Action API.
     * @param page.ns The namespace ID of the page.
     * @param page.title The title of the page.
     */
    static getPageId(wiki : string, page: { ns: number, title: string }) : string;
    /**
     * Get a page's internal ID from a wiki database name (i.e. enwiki), a
     * namespace number, and the page title.
     *
     * @param wiki The database name (e.g. enwiki) to which this page belongs in.
     * @param namespace The namespace ID of the page.
     * @param title The title of the page.
     */
    static getPageId(wiki : string, namespace: number, title: string) : string;
    // eslint-disable-next-line
    static getPageId(
        o1: string | DBSchemaPage,
        o2?: number | { ns: number, title: string},
        o3?: string
    ) : string {
        if (typeof o1 === "string") {
            if (typeof o2 === "number") {
                // From wiki, namespace, and title
                return HashUtils.sha1(`${o1}:${o2}:${o3}`, "base64");
            } else {
                // From wiki and API object
                return HashUtils.sha1(`${o1}:${o2.ns}:${o2.title}`, "base64");
            }
        } else {
            // From database
            return HashUtils.sha1(
                `${o1.pge_wiki}:${o1.pge_namespace}:${o1.pge_page}`,
                "base64"
            );
        }
    }

}