import { Context, Middleware } from "@tsed/common";
import { Forbidden, InternalServerError } from "@tsed/exceptions";
import { verifySessionToken } from "../util";

/**
 * Authenticates users based on the Authorization header
 */
@Middleware()
export class UserAuthMiddleware {
    public async use(@Context() ctx: Context) {
        if (ctx.has("user") || ctx.request.url.startsWith("/v1/docs/")) {
            return;
        }

        const token = ctx.request.req.headers.authorization;
        if (!token) throw new Forbidden("Access token is missing.");

        try {
            const user = verifySessionToken(token);
            ctx.set("user", user);
        } catch (error) {
            throw new InternalServerError(error);
        }
    }
}