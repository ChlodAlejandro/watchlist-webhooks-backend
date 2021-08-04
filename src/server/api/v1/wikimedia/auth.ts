import express from "express";
import ResponseUtils from "../../../../util/ResponseUtils";
import StringUtils from "../../../../util/StringUtils";
import WWBackend from "../../../../WWBackend";
import URLUtils from "../../../../util/URLUtils";
import WikimediaURL from "../../../../wikimedia/WikimediaURL";
import AccessToken from "../../../../wikimedia/AccessToken";

/**
 * Begins authorization with Wikimedia. This sets the proper anti-CSRF cookie
 * and the required state parameter.
 *
 * @param req The Express request.
 * @param res The Express response.
 */
function startWikimediaAuthorization(req : express.Request, res : express.Response) : void {
    if (req.cookies["wmww-cookies"] != null) {
        if (
            req.query["redirect"]
            && (
                // Disallow external URLs
                !`${req.query["redirect"]}`.startsWith("//")
                || `${req.query["redirect"]}`.startsWith(URLUtils.rootURL(req))
            )
        )
            ResponseUtils.resJsonError(res, 400, "Bad post-authorization redirect target");
        else if (req.query["redirect"])
            res.cookie("wmww-postauth-redirect", req.query["redirect"]);

        const target = new URL(WikimediaURL.oauthAuthorize);
        const authId = StringUtils.random(64);

        target.searchParams.set("response_type", "code");
        target.searchParams.set("client_id", process.env["WMWW_WM_CONSUMER_KEY"]);
        target.searchParams.set("redirect_uri", process.env["WMWW_WM_REDIRECT_URI"]);
        target.searchParams.set("state", `start-${authId}`);

        res.cookie("wmww-auth-id", authId);
        res.redirect(target.toString());
    } else {
        // They haven't agreed to cookie use. Redirect to agreement page.
        const target = new URL(URLUtils.fullURL(req));
        target.pathname = "/cookies";
        target.searchParams.set("confirm", "1");
        target.searchParams.set("redirect", req.url);

        res.redirect(target.toString());
    }
}

/**
 * Ends authorization with Wikimedia. This assumes that the authorization
 * code has already been sent by Wikimedia. If that's not the case, we scream
 * in bloody terror.
 *
 * @param req The Express request.
 * @param res The Express response.
 */
async function endWikimediaAuthorization(req, res) : Promise<void> {
    if (req.cookies["wmww-cookies"] == null) {
        // No cookies? Let's send them back.
        const target = new URL(URLUtils.fullURL(req));
        target.pathname = "/cookies";
        target.searchParams.set("confirm", "1");
        target.searchParams.set("redirect", req.url);

        return res.redirect(target.toString());
    }
    if (req.cookies["wmww-auth-id"] == null) {
        // No authentication ID. Regenerate one by redoing the entire process.
        return res.redirect(req.url);
    }
    if (
        req.cookies["wmww-auth-id"].length !== 64
        || /[^A-Za-z0-9]/.test(req.cookies["wmww-auth-id"])
    )
        return ResponseUtils.resJsonError(res, 400, "Bad confirmation id.");
    if (!req.query["code"])
        return ResponseUtils.resJsonError(res, 400, "Missing authorization code.");

    if (`${req.query["state"]}`.substring(6) !== req.cookies["wmww-auth-id"]) {
        return ResponseUtils.resJsonError(res, 403,
            "Confirmation ID mismatch. Make sure cookies are enabled.");
    }

    try {
        let token : AccessToken;

        try {
            // Grab the access token and CentralAuth ID
            token = await AccessToken.fromAuthorizationCode(req.query["code"]);
        } catch (e) {
            WWBackend.log.error(`Failed to get authorization access token: ${e.message}`);
            if (e.isAxiosError) {
                if (e.response.data["hint"] === "Authorization code has been revoked") {
                    // Code has been revoked. Let's try again.
                    return res.redirect("/wikimedia");
                }
                // Only dump the stack if we don't know what happened.
                WWBackend.log.error(e.response.data);
            }

            ResponseUtils.resJsonError(res, 500, "Failed to authorize. Please try again.");
        }

        // Save all data
        await token.save(async (sql) => {
            const expiry = new Date();
            expiry.setDate(expiry.getDate() + 30);

            // Also save session cookies for control panel access.
            await sql.query(
                "INSERT INTO `sessions` (`ses_id`, `ses_account`, `ses_expiry`) VALUES (?, ?, ?)",
                [
                    req.cookies["wmww-auth-id"],
                    token.centralAuthID,
                    expiry.toISOString().replace(/[TZ]/g, " ").trim()
                ]
            );
        });

        WWBackend.log.debug(`User logged in: ${token.centralAuthID}`);

        // Redirect if we have to.
        if (req.cookies["wmww-postauth-redirect"]) {
            res.redirect(req.cookies["wmww-postauth-redirect"]);
        } else
            ResponseUtils.resJson(res, {
                error: false,
                userId: token.centralAuthID
            });
    } catch (e) {
        WWBackend.log.error("Failed to get authorization information.", e);
        if (e.isAxiosError)
            WWBackend.log.error(e.response.data);
        ResponseUtils.resJsonError(res, 500, "Failed to save authorization information.");
    }
}

/**
 * Authenticates a user on a Wikimedia wiki.
 */
export default function(req : express.Request, res : express.Response) : void {
    if (req.query["state"] == null) {
        startWikimediaAuthorization(req, res);
    } else if (`${req.query["state"]}`.startsWith("start-")) {
        endWikimediaAuthorization(req, res);
    } else {
        ResponseUtils.resJsonError(res, 400, "Invalid authorizations state.");
    }
}