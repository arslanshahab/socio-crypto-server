import { Context, Middleware, Req } from "@tsed/common";
import { Forbidden } from "@tsed/exceptions";
import { getActiveAdmin } from "../controllers/helpers";
import { Inject } from "@tsed/di";
import { SessionService } from "../services/SessionService";

/**
 * Authenticates users based on the Authorization header
 */
@Middleware()
export class UserAuthMiddleware {
    @Inject()
    private sessionService: SessionService;

    public async use(@Req() req: Req, @Context() ctx: Context) {
        const isPublicRoute =
            ctx.request.url.startsWith("/v1/docs") ||
            ctx.request.url.startsWith("/v1/auth") ||
            ctx.request.url.startsWith("/v1/referral") ||
            ctx.request.url.startsWith("/v1/participant/track-action") ||
            ctx.request.url.startsWith("/v1/organization/register") ||
            ctx.request.url.startsWith("/v1/kyc/webhook");

        const adminToken = req.headers.cookie?.split("session=")[1];

        if (adminToken && !isPublicRoute) {
            const admin = await getActiveAdmin(adminToken);
            ctx.set("user", admin);
            return;
        }

        if (ctx.has("user") || isPublicRoute) {
            return;
        }

        const token = ctx.request.req.headers.authorization;
        if (!token) throw new Forbidden("Access token is missing.");
        const data = await this.sessionService.verifySession(token);
        ctx.set("user", data);
    }
}
