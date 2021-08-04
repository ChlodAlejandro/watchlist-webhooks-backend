interface DBSchemaWebhook {

    /**
     * The ID for this webhook.
     */
    whk_id : number;

    /**
     * The ID of the owner of this webhook.
     */
    whk_account : number;

    /**
     * The target webhook URL.
     */
    whk_url : string;

    /**
     * The format of the payload.
     */
    whk_format : string;

}

export default DBSchemaWebhook;