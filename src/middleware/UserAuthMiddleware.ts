import { Context, Middleware, Req } from "@tsed/common";
import { Forbidden, InternalServerError } from "@tsed/exceptions";
// import { Firebase } from "../clients/firebase";
import { verifySessionToken } from "../util";

/**
 * Authenticates users based on the Authorization header
 */
@Middleware()
export class UserAuthMiddleware {
    public async use(@Req() req: Req, @Context() ctx: Context) {
        // const tokenAdmin =ctx.request.req.headers.cookie;
        // const decodedToken = await Firebase.verifySessionCookie(tokenAdmin);
        // const firebaseUser = await Firebase.getUserById(decodedToken.uid);
        // const admin = {
        //     id: decodedToken.uid,
        //     method: "firebase",
        //     ...decodedToken,
        //     ...(firebaseUser.customClaims && {
        //         role: firebaseUser.customClaims.role,
        //         company: firebaseUser.customClaims.company,
        //         tempPass: firebaseUser.customClaims.tempPass || false,
        //     }),
        // };
        // console.log("decodedToken---------------", admin);
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
