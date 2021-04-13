/* eslint-disable jsdoc/require-jsdoc */
/**
 * A predefined set of Wikimedia URLs.
 */
export default class WikimediaURL {

    public static readonly restApi = "https://meta.wikimedia.org/w/rest.php";
    public static readonly oauthAuthorize = `${WikimediaURL.restApi}/oauth2/authorize`;
    public static readonly oauthAccessToken = `${WikimediaURL.restApi}/oauth2/access_token`;
    public static readonly oauthProfile = `${WikimediaURL.restApi}/oauth2/resource/profile`;

    /**
     * Gets the action API link of a project.
     * @param project The project to use (e.g. `en.wikipedia`)
     */
    public static actionApi(project : string) : string {
        return `https://${project}.org/w/api.php`;
    }

}