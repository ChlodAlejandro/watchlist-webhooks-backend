/* eslint-disable jsdoc/require-jsdoc */

import axios from "axios";

/**
 * A predefined set of Wikimedia URLs.
 */
export default class WikimediaURL {

    public static readonly metaApi = "https://meta.wikimedia.org/w/api.php";
    public static readonly restApi = "https://meta.wikimedia.org/w/rest.php";
    public static readonly oauthAuthorize = `${WikimediaURL.restApi}/oauth2/authorize`;
    public static readonly oauthAccessToken = `${WikimediaURL.restApi}/oauth2/access_token`;
    public static readonly oauthProfile = `${WikimediaURL.restApi}/oauth2/resource/profile`;

    /** A list of Wikimedia projects, mapped by database name. */
    static readonly siteMatrix : Map<string, string> = new Map();

    /**
     * Gets the action API link of a project.
     * @param project The project database name (e.g. `enwiki`)
     */
    public static actionApi(project : string) : string {
        return `https://${WikimediaURL.siteMatrix.get(project)}/w/api.php`;
    }

    /**
     * Builds all required caches.
     */
    static async buildCache() : Promise<void> {
        const matrixRequest = await axios({
            url: WikimediaURL.metaApi,
            params: {
                action: "sitematrix"
            },
            responseType: "json"
        });

        const matrixData = matrixRequest.data;

        for (
            const language of
            Object.keys(matrixData["sitematrix"]).filter(i => !isNaN(+(i)))
        ) {
            for (const wiki of matrixData["sitematrix"][language]["site"]) {
                WikimediaURL.siteMatrix.set(wiki["dbname"], wiki["url"].replace(/https?:\/\//g, ""));
            }
        }

        for (const specialWiki of matrixData["sitematrix"]["specials"]) {
            WikimediaURL.siteMatrix.set(specialWiki["dbname"], specialWiki["url"].replace(/https?:\/\//g, ""));
        }
    }

}