import Http from "http";
import { Configuration } from "@tsed/di";
import "@tsed/ajv";
import "@tsed/swagger";
import { Inject } from "@tsed/di";
import { PlatformApplication } from "@tsed/common";
import { UserAuthMiddleware } from "./middleware/UserAuthMiddleware";
import "./services/PrismaService";
// import * as bodyParser from "body-parser";
// import * as compress from "compression";
// import * as cookieParser from "cookie-parser";
// import * as methodOverride from "method-override";

// based on https://tsed.io/getting-started/migrate-from-express.html#create-server
// todo uncomment this code when all the routes are migrated

const { NODE_ENV = "development" } = process.env;

@Configuration({
    acceptMimes: ["application/json"],
    port: process.env.PORT || 8080,
    mount: {
        "/v1": [`./src/controllers/v1/**/*.[jt]s`],
    },
    swagger:
        NODE_ENV !== "production"
            ? [
                  {
                      path: "/v1/docs",
                      specVersion: "3.0.1",
                  },
              ]
            : undefined,
})
export class RestServer {
    @Inject() private app: PlatformApplication;
    @Inject() private server: Http.Server;

    /**
     * This method let you configure the express middleware required by your application to works.
     * @returns {Server}
     */
    public $beforeRoutesInit(): void | Promise<any> {
        this.server.timeout = 1000000;
        this.server.keepAliveTimeout = 90000;

        this.app.use(UserAuthMiddleware);
        // Add middlewares here only when all of your legacy routes are migrated to Ts.ED
        //   .use(cookieParser())
        //   .use(compress({}))
        //   .use(methodOverride())
        //   .use(bodyParser.json())
        //   .use(bodyParser.urlencoded({
        //     extended: true
        //   }));
    }
}
