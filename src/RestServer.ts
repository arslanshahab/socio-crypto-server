import Http from "http";
import { Configuration } from "@tsed/di";
import "@tsed/ajv";
import "@tsed/swagger";
import { Inject } from "@tsed/di";
import { PlatformApplication } from "@tsed/common";
import { UserAuthMiddleware } from "./middleware/UserAuthMiddleware";
import "./services/PrismaService";
import "./middleware/HttpExceptionFilter";
import RedisClient from "cache-manager-redis-store";
// import * as bodyParser from "body-parser";
// import * as compress from "compression";
// import * as cookieParser from "cookie-parser";
// import * as methodOverride from "method-override";
import { ParticipantClickTracking } from "./middleware/ParticipantClickTracking";

// based on https://tsed.io/getting-started/migrate-from-express.html#create-server
// todo uncomment this code when all the routes are migrated

const { NODE_ENV = "development", REDIS_HOST = "localhost", REDIS_PORT = "6379" } = process.env;

@Configuration({
    acceptMimes: ["application/json"],
    port: process.env.PORT || 8080,
    mount: {
        "/v1": [`${__dirname}/controllers/v1/**/*.[jt]s`],
    },
    cache: {
        ttl: 3600,
        store: RedisClient.create({ host: REDIS_HOST, port: Number(REDIS_PORT) }),
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
        this.app.use("/v1/referral/:participantId", ParticipantClickTracking);
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
