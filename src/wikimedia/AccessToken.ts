import WWBackend from "../WWBackend";
import {TimeUtils} from "../util/TimeUtils";
import axios, {AxiosRequestConfig} from "axios";
import QueryString from "querystring";
import WikimediaURL from "./WikimediaURL";
import mysql from "mysql2/promise";

/**
 * The response returned by the MediaWiki OAuth API after a successful
 * request for an access token.
 */
interface AccessTokenResponse {
    "token_type": string;
    "expires_in": number;
    "access_token": string;
    "refresh_token": string;
}

/**
 * An access token allows communication with the MediaWiki API as a
 * given user. This is part of the OAuth authorization process when
 * making requests to the API.
 */
export default class AccessToken {

    /**
     * The CentralAuth ID of the user associated with this token.
     */
    private _centralAuthID : number | null;
    /** The access token. Used for authorization. */
    private _accessToken : string;
    /** The refresh token. Used to regenerate an expired access token. */
    private _refreshToken : string;
    /** The expiry of the token. */
    private _expiry : Date;
    /** The registration time of the token. */
    private _registry : Date;

    /** The CentralAuth ID of the user associated with this token. */
    public get centralAuthID() : number {
        return this._centralAuthID;
    }

    /**
     * Creates an AccessToken object from an authorization code.
     */
    static async fromAuthorizationCode(authorizationCode : string) : Promise<AccessToken> {
        const tokenData : AccessTokenResponse =
            (await axios({
                method: "post",
                url: WikimediaURL.oauthAccessToken,
                data: QueryString.stringify({
                    "client_id": process.env["WMWW_WM_CONSUMER_KEY"],
                    "client_secret": process.env["WMWW_WM_CONSUMER_TOKEN"],
                    "redirect_uri": process.env["WMWW_WM_REDIRECT_URI"],
                    "grant_type": "authorization_code",
                    "code": authorizationCode
                }),
                responseType: "json"
            })).data;

        const token = new AccessToken(tokenData);
        await token.getCentralAuthId();
        return token;
    }

    /**
     * Creates an access token object from an access token request response.
     * @param response The access token request response.
     */
    constructor(response : AccessTokenResponse) {
        this.setFromResponse(response);
    }

    /**
     * Sets the values of the token from an access token request response.
     * @private
     */
    private setFromResponse(response : AccessTokenResponse) {
        this._accessToken = response.access_token;
        this._refreshToken = response.refresh_token;
        this._registry = new Date();
        this._expiry = new Date();
        this._expiry.setSeconds(this._expiry.getSeconds() + response.expires_in);
    }

    /**
     * Gets the user's CentralAuth ID and associates it with this token.
     * @private
     */
    private async getCentralAuthId() : Promise<void> {
        // Get user information
        const infoRequest = await axios(await this.upgradeRequest({
            url: WikimediaURL.oauthProfile,
            responseType: "json"
        }));

        this._centralAuthID = infoRequest.data["sub"];
    }

    /**
     * Regenerates this access token using its refresh token.
     */
    async refresh() : Promise<void> {
        const tokenRequest = await axios({
            method: "post",
            url: WikimediaURL.oauthAccessToken,
            data: QueryString.stringify({
                "client_id": process.env["WMWW_WM_CONSUMER_KEY"],
                "client_secret": process.env["WMWW_WM_CONSUMER_TOKEN"],
                "redirect_uri": process.env["WMWW_WM_REDIRECT_URI"],
                "grant_type": "refresh_token",
                "refresh_token": this._refreshToken
            }),
            responseType: "json"
        });

        const tokenData : AccessTokenResponse = tokenRequest.data;
        this.setFromResponse(tokenData);
    }

    /**
     * Saves the token to the database.
     * @param extraCallback Extra callback to perform in case more data needs to be saved.
     */
    async save(extraCallback : (connection : mysql.Connection) => any) : Promise<void> {
        if (this._centralAuthID == null)
            await this.getCentralAuthId();

        // Save all data
        await WWBackend.database.useConnection(async (sql) => {
            await sql.query(`
                INSERT INTO \`accounts\` (
                    \`acc_id\`, 
                    \`acc_access\`, 
                    \`acc_refresh\`, 
                    \`acc_token_expiry\`, 
                    \`acc_token_registry\`
                ) VALUES (?, ?, ?, ?, ?) ON DUPLICATE KEY UPDATE 
                    \`acc_access\` = ?, 
                    \`acc_refresh\` = ?,
                    \`acc_token_expiry\` = ?,
                    \`acc_token_registry\` = ?
            `, [
                this._centralAuthID,
                this._accessToken,
                this._refreshToken,
                TimeUtils.datetime(this._expiry),
                TimeUtils.datetime(this._registry),
                this._accessToken,
                this._refreshToken,
                TimeUtils.datetime(this._expiry),
                TimeUtils.datetime(this._registry)
            ]);

            await extraCallback(sql);
        });
    }

    /**
     * Upgrades a request with the proper authentication headers.
     *
     * @param config The Axios request configuration.
     */
    async upgradeRequest(config? : AxiosRequestConfig) : Promise<AxiosRequestConfig> {
        if (this._registry.getTime() - this._registry.getTime() > 60000)
            await this.refresh();

        if (config.headers == null)
            config.headers = {};

        config.headers["Authorization"] = `Bearer ${this._accessToken}`;

        return config;
    }

}