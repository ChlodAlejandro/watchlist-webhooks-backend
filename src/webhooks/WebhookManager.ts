import WWBackend from "../WWBackend";
import DBSchemaAccount from "../database/schema/Account";
import DBSchemaWebhook from "../database/schema/Webhook";
import mysql from "mysql2/promise";

/**
 * Manages all user-defined webhooks.
 */
export default class WebhookManager {

    /**
     * Creates a webhook endpoint.
     *
     * @param account The account that owns the webhook.
     * @param url The target URL of the webhook.
     * @param format The format of the payload.
     */
    async createWebhook(account : DBSchemaAccount, url : string, format = "{}") : Promise<void> {
        if (format.length > 65535)
            throw "Format length too large.";

        try { JSON.parse(format); } catch (e) {
            throw "Format is not valid JSON.";
        }

        await WWBackend.database.useConnection(async (sql) => {
            await sql.execute(`
                INSERT INTO \`webhooks\` (
                    whk_account, whk_url, whk_format
                ) VALUES (
                    ?, ?, ?
                )
            `, [account.acc_id, url, format]);
        });
    }

    /**
     * Modifies an existing webhook. If the webhook does not exist, it will be created.
     *
     * @param webhook The webhook or webhook ID to modify.
     * @param options The new webhook details.
     */
    async modifyWebhook(
        webhook : DBSchemaWebhook | number,
        options : Partial<Omit<DBSchemaWebhook, "whk_id" | "whk_account">> = {}
    ) : Promise<void> {
        const finalWebhook = Object.assign(
            typeof webhook === "object" ? webhook : { "whk_id": webhook }, options
        );

        await WWBackend.database.useConnection(async (sql) => {
            await sql.execute(`
                UPDATE \`webhooks\`
                SET whk_url = ?, whk_format = ?
                WHERE whk_id = ?
            `, [finalWebhook.whk_url, finalWebhook.whk_format, finalWebhook.whk_id]);
        });
    }

    /**
     * Deletes an existing webhook.
     * @param webhook The webhook or webhook ID.
     */
    async deleteWebhook(webhook : DBSchemaWebhook | number) : Promise<void> {
        const id = typeof webhook === "object" ? webhook.whk_id : webhook;

        await WWBackend.database.useConnection(async (sql) => {
            await sql.execute(`
                DELETE FROM \`webhooks\` WHERE whk_id = ?
            `, [id]);
        });
    }

    /**
     * Get a webhook using its ID.
     * @param id The webhook ID.
     */
    async getWebhook(id: number) : Promise<DBSchemaWebhook> {
        return WWBackend.database.useConnection(async (sql) => {
            return <DBSchemaWebhook>(await sql.query<mysql.RowDataPacket[]>(`
                SELECT * FROM webhooks WHERE whk_id = ? LIMIT 1
            `, [id]))[0 /* rows */][0 /* row */];
        });
    }

    /**
     * Get an account's webhooks.
     *
     * @param account The DBSchemaAccount to get webhooks.
     */
    async getWebhooks(account: DBSchemaAccount) : Promise<DBSchemaWebhook[]> {
        return WWBackend.database.useConnection(async (sql) => {
            return <DBSchemaWebhook[]>(await sql.query<mysql.RowDataPacket[]>(`
                SELECT * FROM webhooks WHERE whk_account = ?
            `, [account.acc_id]))[0 /* rows */];
        });
    }

}
