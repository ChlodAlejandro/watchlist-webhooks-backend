interface DBSchemaAccount {

    /**
     * The CentralAuth ID of this user.
     */
    "acc_id": number;
    /**
     * The access token of this user.
     */
    "acc_access": string;
    /**
     * The refresh token of this user.
     */
    "acc_refresh": string;
    /**
     * The number of seconds until this access token expires.
     */
    "acc_token_expiry": number;
    /**
     * The registry time of this access token.
     */
    "acc_token_registry": Date;

}

export default DBSchemaAccount;