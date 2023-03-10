import express from "express";
import cors from "cors";
import bodyParser from "body-parser";
import { Connection, getConnectionOptions, createConnection } from "typeorm";
import { PlatformExpress } from "@tsed/platform-express";
import { PlatformBuilder } from "@tsed/common";
import logger from "./util/logger";
import { Secrets } from "./util/secrets";
import { authenticateAdmin, authenticateUser } from "./middleware/authentication";
import { Dragonchain } from "./clients/dragonchain";
import { FirebaseMobile } from "./clients/firebaseMobile";
import { FirebaseAdmin } from "./clients/firebaseAdmin";
// import * as FactorController from "./controllers/factor";
// import * as Dragonfactor from "@myfii-dev/dragonfactor-auth";
// import { paypalWebhook } from "./controllers/withdraw";
import { adminResolvers, publicResolvers, resolvers } from "./graphql/resolvers";
import { adminLogin, adminLogout, updateUserPassword } from "./controllers/authentication";
import cookieParser from "cookie-parser";
import { StripeAPI } from "./clients/stripe";
// import { stripeWebhook } from "./controllers/stripe";
import { ApolloServer } from "apollo-server-express";
import { typeDefs } from "./graphql/schema";
import { ApolloServerPlugin } from "apollo-server-plugin-base";
import { initXoxoday, getXoxodayFilters, uploadXoxodayTokens } from "./controllers/xoxoday";
import {
    initWallet,
    saveWallet,
    getAccountTransactions,
    getAccountBalance,
    unblockAccountBalance,
    listBlockedAmounts,
    blockAccountBalance,
    getAllWithdrawls,
    transferBalance,
    createTatumAccount,
    trackCoiinTransactionForUser,
    getAccountDetails,
} from "./controllers/tatum";
// import { kycWebhook } from "./controllers/kyc";
import { GraphQLRequestContext } from "../node_modules/apollo-server-types/dist/index.d";
import * as Sentry from "@sentry/node";
import * as Tracing from "@sentry/tracing";
import { FormattedError } from "./util/errors";
import { RestServer } from "./RestServer";
// import admin from "firebase-admin";

const { NODE_ENV = "development" } = process.env;

export class Application {
    private app: express.Application;
    private platform: PlatformBuilder;
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
        await FirebaseAdmin.initialize();
        await FirebaseMobile.initialize();
        await Dragonchain.initialize();
        StripeAPI.initialize();
        this.app = express();
        Sentry.init({
            dsn: Secrets.sentryDSN,
            debug: true,
            environment: process.env.NODE_ENV || "staging",
            tracesSampler: (context) => {
                if (context.request?.url?.endsWith("/v1/health")) return 0;

                // default sample rate
                return 0.2;
            },
            integrations: [
                // enable HTTP calls tracing
                new Sentry.Integrations.Http({ tracing: true }),
                new Tracing.Integrations.Express({ app: this.app }),
            ],
        });
        const corsSettings = {
            origin: [
                "https://raiinmaker.dragonchain.com",
                "https://raiinmaker-staging.dragonchain.com",
                "https://mock-raiinmaker-landing.dragonchain.com",
                "https://raiinmaker.com",
                "https://www.raiinmaker.com",
                "https://seed-staging.raiinmaker.com",
                "https://seed.raiinmaker.com",
                "https://raiinmaker-mobile.web.app",
                "https://app.raiinmaker.com",
                "https://opensourcemoney.tv",
            ],
            methods: ["GET", "POST", "PUT"],
            exposedHeaders: ["x-auth-token"],
            credentials: true,
        };
        if (NODE_ENV !== "production") {
            corsSettings.origin.push("http://localhost:3000");
        }
        this.app.use(Sentry.Handlers.requestHandler());
        this.app.use(Sentry.Handlers.tracingHandler());
        this.app.use(cookieParser());
        this.app.use(cors(corsSettings));
        // this.app.post("/v1/payments", bodyParser.raw({ type: "application/json" }), stripeWebhook);
        this.app.use(bodyParser.json({ limit: "550mb" }));
        this.app.use(bodyParser.urlencoded({ extended: true }));
        this.app.set("port", process.env.PORT || 8080);

        const filterOperationName = (context: GraphQLRequestContext) => {
            const query = context.request.query?.split(" ")[1];
            return query ? query.split("(")[0] : "";
        };

        const requestPlugin: ApolloServerPlugin = {
            async requestDidStart(requestContext) {
                console.log({
                    timestamp: new Date().toISOString(),
                    operation: filterOperationName(requestContext),
                    request: requestContext.request.http?.url,
                });

                return {
                    async didEncounterErrors(ctx) {
                        for (const err of ctx.errors) {
                            Sentry.withScope((scope) => {
                                scope.setTag("kind", filterOperationName(requestContext));
                                scope.setExtra("headers", JSON.stringify(ctx.request.http?.headers));
                                scope.setExtra("context", ctx.context);
                                scope.setExtra("query", ctx.request.query);
                                scope.setExtra("variables", ctx.request.variables);
                                scope.addBreadcrumb({
                                    category: "query-path",
                                    message: err?.path?.join(" > ") || "",
                                    level: Sentry.Severity.Debug,
                                });
                                Sentry.captureException(err);
                                if (!FormattedError.isFormatted(err.extensions?.code)) {
                                    Sentry.captureMessage(
                                        `Caught something Fatal - ${
                                            ctx.operationName || filterOperationName(requestContext)
                                        }`
                                    );
                                } else {
                                    Sentry.captureMessage(
                                        `Caught an Error - ${ctx.operationName || filterOperationName(requestContext)}`,
                                        Sentry.Severity.Error
                                    );
                                }
                            });
                        }
                    },
                };
            },
        };

        const server = new ApolloServer({
            typeDefs,
            resolvers,
            plugins: [requestPlugin],
            context: authenticateUser,
        });

        const serverAdmin = new ApolloServer({
            typeDefs,
            resolvers: adminResolvers,
            plugins: [requestPlugin],
            context: authenticateAdmin,
        });

        const serverPublic = new ApolloServer({
            typeDefs,
            plugins: [requestPlugin],
            resolvers: publicResolvers,
        });

        await server.start();
        await serverAdmin.start();
        await serverPublic.start();

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

        this.app.get("/v1/health", (_req: express.Request, res: express.Response) =>
            res.send("I am alive and well, thank you!")
        );
        this.app.post("/v1/login", adminLogin);
        this.app.post("/v1/logout", adminLogout);
        this.app.put("/v1/password", updateUserPassword);
        // this.app.post("/v1/payouts", paypalWebhook);
        this.app.post("/v1/xoxoday", initXoxoday);
        this.app.post("/v1/xoxoday/tokens", uploadXoxodayTokens);
        this.app.post("/v1/tatum/initWallet", initWallet);
        this.app.post("/v1/tatum/saveWallet", saveWallet);
        this.app.post("/v1/tatum/createAccount", createTatumAccount);
        this.app.post("/v1/tatum/transactions", getAccountTransactions);
        this.app.post("/v1/tatum/unblock", unblockAccountBalance);
        this.app.post("/v1/tatum/block", blockAccountBalance);
        this.app.post("/v1/tatum/blockedAmount/list", listBlockedAmounts);
        this.app.post("/v1/tatum/balance", getAccountBalance);
        this.app.post("/v1/tatum/account", getAccountDetails);
        this.app.post("/v1/tatum/list-withdraws", getAllWithdrawls);
        this.app.post("/v1/tatum/transfer", transferBalance);
        this.app.get("/v1/xoxoday/filters", getXoxodayFilters);
        // this.app.post("/v1/kyc/webhook", kycWebhook);
        // this.app.use(
        //     "/v1/dragonfactor/login",
        //     Dragonfactor.expressMiddleware({
        //         service: "raiinmaker",
        //         acceptedFactors: ["email"],
        //         timeVariance: 5000,
        //     }),
        //     FactorController.login
        // );
        // this.app.use(
        //     "/v1/dragonfactor/recover",
        //     Dragonfactor.accountRecoveryMiddleware({
        //         service: "raiinmaker",
        //         timeVariance: 5000,
        //     }),
        //     FactorController.recover
        // );
        this.app.use("/v1/tatum/subscription/:userId/:accountId", trackCoiinTransactionForUser);

        this.platform = await PlatformExpress.bootstrap(RestServer, {
            express: { app: this.app },
        });

        this.app.use(Sentry.Handlers.errorHandler());
    }

    public async startServer() {
        await this.platform.listen();
        logger.info(`App is running at http://localhost:${this.app.get("port")} in ${this.app.get("env")} mode`);
        logger.info("Press CTRL-C to stop\n");
    }
}
