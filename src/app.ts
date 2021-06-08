import express from "express";
import cors from "cors";
import { Server } from "http";
import bodyParser from "body-parser";
import { Connection, getConnectionOptions, createConnection } from "typeorm";
import logger from "./util/logger";
import { Secrets } from "./util/secrets";
import { authenticate, firebaseAuth } from "./middleware/authentication";
import { errorHandler } from "./middleware/errorHandler";
import { Dragonchain } from "./clients/dragonchain";
import { Firebase } from "./clients/firebase";
import * as FactorController from "./controllers/factor";
import * as Dragonfactor from "@dragonchain-dev/dragonfactor-auth";
import { paypalWebhook } from "./controllers/withdraw";
// import {Paypal} from "./clients/paypal";
import {
    adminResolvers,
    publicResolvers,
    resolvers,
} from "./graphql/resolvers";
import {
    sessionLogin,
    sessionLogout,
    updateUserPassword,
} from "./controllers/firebase";
import { trackClickByLink } from "./controllers/participant";
import cookieParser from "cookie-parser";
import { StripeAPI } from "./clients/stripe";
import { stripeWebhook } from "./controllers/stripe";
import { ApolloServer } from "apollo-server-express";
import { typeDefs } from "./graphql/schema";
import { ApolloServerPlugin } from "apollo-server-plugin-base";

const { NODE_ENV = "development" } = process.env;

export class Application {
    public app: express.Application;
    public runningServer: Server;
    public databaseConnection: Connection;

    public async connectDatabase() {
        const connectionOptions = await getConnectionOptions();
        Object.assign(connectionOptions, {
            entities: [__dirname + "/models/*"],
        });
        return await createConnection(connectionOptions);
    }

    public async initializeServer() {
        this.databaseConnection = await this.connectDatabase();
        await Secrets.initialize();
        await Firebase.initialize();
        await Dragonchain.initialize();
        // await Paypal.initialize();
        // await Paypal.refreshToken();
        StripeAPI.initialize();
        this.app = express();
        const corsSettings = {
            origin: [
                "https://raiinmaker.dragonchain.com",
                "https://raiinmaker-staging.dragonchain.com",
                "https://mock-raiinmaker-landing.dragonchain.com",
                "https://raiinmaker.com",
                "https://www.raiinmaker.com",
                "https://seed-staging.raiinmaker.com",
                "https://seed.raiinmaker.com",
            ],
            methods: ["GET", "POST", "PUT"],
            exposedHeaders: ["x-auth-token"],
            credentials: true,
        };
        if (NODE_ENV !== "production")
            corsSettings.origin.push("http://localhost:3000");
        this.app.use(cookieParser());
        this.app.use(cors(corsSettings));
        this.app.post(
            "/v1/payments",
            bodyParser.raw({ type: "application/json" }),
            stripeWebhook
        );
        this.app.use(bodyParser.json({ limit: "30mb" }));
        this.app.use(bodyParser.urlencoded({ extended: true }));
        this.app.set("port", process.env.PORT || 8080);
        const requestPlugin: ApolloServerPlugin = {
            requestDidStart(requestContext) {
                console.log({
                    timestamp: new Date().toISOString(),
                    operation: requestContext.request.operationName,
                });
            },
        };
        const server = new ApolloServer({
            typeDefs,
            resolvers,
            plugins: [requestPlugin],
            context: authenticate,
        });
        const serverAdmin = new ApolloServer({
            typeDefs,
            resolvers: adminResolvers,
            plugins: [requestPlugin],
            context: firebaseAuth,
        });
        const serverPublic = new ApolloServer({
            typeDefs,
            plugins: [requestPlugin],
            resolvers: publicResolvers,
        });
        server.applyMiddleware({
            app: this.app,
            path: "/v1/graphql",
            cors: corsSettings,
        });
        serverAdmin.applyMiddleware({
            app: this.app,
            path: "/v1/admin/graphql",
            cors: corsSettings,
        });
        serverPublic.applyMiddleware({
            app: this.app,
            path: "/v1/public/graphql",
            cors: corsSettings,
        });
        this.app.get(
            "/v1/health",
            (_req: express.Request, res: express.Response) =>
                res.send("I am alive and well, thank you!")
        );
        this.app.post("/v1/login", sessionLogin);
        this.app.post("/v1/logout", sessionLogout);
        this.app.put("/v1/password", updateUserPassword);
        this.app.post("/v1/payouts", paypalWebhook);
        this.app.use(
            "/v1/dragonfactor/login",
            Dragonfactor.expressMiddleware({
                service: "raiinmaker",
                acceptedFactors: ["email"],
                timeVariance: 5000,
            }),
            FactorController.login
        );
        this.app.use(
            "/v1/dragonfactor/recover",
            Dragonfactor.accountRecoveryMiddleware({
                service: "raiinmaker",
                timeVariance: 5000,
            }),
            FactorController.recover
        );
        this.app.use("/v1/referral/:participantId", trackClickByLink);
        this.app.use(errorHandler);
    }

    public async startServer() {
        this.runningServer = this.app.listen(
            this.app.get("port"),
            "0.0.0.0",
            () => {
                this.runningServer.timeout = 1000000;
                this.runningServer.keepAliveTimeout = 90000;
                logger.info(
                    `App is running at http://localhost:${this.app.get(
                        "port"
                    )} in ${this.app.get("env")} mode`
                );
                logger.info("Press CTRL-C to stop\n");
            }
        );
    }
}
