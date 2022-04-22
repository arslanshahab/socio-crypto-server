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

        const token =
            ctx.request.req.headers.authorization ||
            "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJlbWFpbCI6Im11cmFkQHJhaWlubWFrZXIuY29tIiwiaWQiOm51bGwsInVzZXJJZCI6ImVlYmYzMDdjLTMxMjgtNGU2MC04ZGNmLTE2OWI1MDU5NGJkNCIsInJvbGUiOiJhZG1pbiIsImlhdCI6MTY1MDI3OTc0NSwiZXhwIjoxNjUwODg0NTQ1LCJhdWQiOiJodHRwOi8vbG9jYWxob3N0OjQwMDAifQ.Mc-wGHpcCphLSvq9OVQ_wyr150Jy_CebuTkiUneMJIw";
        if (!token) throw new Forbidden("Access token is missing.");

        try {
            const user = verifySessionToken(token);
            ctx.set("user", user);
        } catch (error) {
            throw new InternalServerError(error);
        }
    }
}
