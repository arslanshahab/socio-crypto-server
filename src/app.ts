import express from "express";
import cors from "cors";
import { Server } from "http";
import bodyParser from "body-parser";
import { Connection, getConnectionOptions, createConnection } from "typeorm";
import logger from "./util/logger";
import { Secrets } from "./util/secrets";
import { authenticateAdmin, authenticateUser } from "./middleware/authentication";
import { errorHandler } from "./middleware/errorHandler";
import { Dragonchain } from "./clients/dragonchain";
import { Firebase } from "./clients/firebase";
import * as FactorController from "./controllers/factor";
import * as Dragonfactor from "@myfii-dev/dragonfactor-auth";
import { paypalWebhook } from "./controllers/withdraw";
import { adminResolvers, publicResolvers, resolvers } from "./graphql/resolvers";
import { adminLogin, adminLogout, updateUserPassword } from "./controllers/authentication";
import { trackClickByLink } from "./controllers/participant";
import cookieParser from "cookie-parser";
import { StripeAPI } from "./clients/stripe";
import { stripeWebhook } from "./controllers/stripe";
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
} from "./controllers/tatum";
import { kycWebhook } from "./controllers/kyc";
import FormData from "form-data";
import fs from "fs";
import axios from "axios";
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
        if (NODE_ENV !== "production") {
            corsSettings.origin.push("http://localhost:3000");
            // corsSettings.origin.push("https://studio.apollographql.com");
        }
        this.app.use(cookieParser());
        this.app.use(cors(corsSettings));
        this.app.post("/v1/payments", bodyParser.raw({ type: "application/json" }), stripeWebhook);
        this.app.use(bodyParser.json({ limit: "550mb" }));
        this.app.use(bodyParser.urlencoded({ extended: true }));
        this.app.set("port", process.env.PORT || 8080);
        const requestPlugin: ApolloServerPlugin = {
            async requestDidStart(requestContext) {
                console.log({
                    timestamp: new Date().toISOString(),
                    operation: requestContext.request.operationName,
                    request: requestContext.request.http?.url,
                    // variables: requestContext.request.variables,
                });

                return {
                    async didEncounterErrors(requestContext) {
                        requestContext.errors.forEach((error) => {
                            console.log(`${error?.extensions?.code || "ERROR"}: ${error?.message || ""}`);
                        });
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
        this.app.post("/v1/payouts", paypalWebhook);
        this.app.post("/v1/xoxoday", initXoxoday);
        this.app.post("/v1/xoxoday/tokens", uploadXoxodayTokens);
        this.app.post("/v1/tatum/initWallet", initWallet);
        this.app.post("/v1/tatum/saveWallet", saveWallet);
        this.app.post("/v1/tatum/transactions", getAccountTransactions);
        this.app.post("/v1/tatum/unblock", unblockAccountBalance);
        this.app.post("/v1/tatum/block", blockAccountBalance);
        this.app.post("/v1/tatum/blockedAmount/list", listBlockedAmounts);
        this.app.post("/v1/tatum/balance", getAccountBalance);
        this.app.post("/v1/tatum/list-withdraws", getAllWithdrawls);
        this.app.post("/v1/tatum/transfer", transferBalance);
        this.app.get("/v1/xoxoday/filters", getXoxodayFilters);
        this.app.post("/v1/dragonfactor/webhook", kycWebhook);
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

        // testing tiktok video upload

        this.app.post("/v1/tiktok/upload", async (req, res) => {
            const openId = "a509c4e1-a862-43e3-9a3f-0f91b1389adc";
            const accessToken = "act.061c62cc03b92c2ddecbe98986a2dca3Na3Xe2ta06DTNkRWTXURuLa9mDZq";
            const url = `https://open-api.tiktok.com/share/video/upload?open_id=${openId}&access_token=${accessToken}`;
            const data = new FormData();
            data.append("video", fs.createReadStream("uploads/example.mp4"));
            const result = await axios.post(url, data, {
                headers: data.getHeaders(),
            });
            res.send(result.data);
        });

        //!--------------------------------
        // TIKTO TESTING API ROUTES
        const CLIENT_KEY = "awtv37zowsh2ryq2"; // this value can be found in app's developer portal
        const CLIENT_SECRET = "2148282ddd97249d7cad91ff030c0a60"; // this value can be found in app's developer portal

        const SERVER_ENDPOINT_REDIRECT = "https://raiinmaker.loca.lt/redirect";

        this.app.get("/oauth", (req, res) => {
            const csrfState = Math.random().toString(36).substring(7);
            res.cookie("csrfState", csrfState, { maxAge: 60000 });
            let url = "https://open-api.tiktok.com/platform/oauth/connect/";
            url += `?client_key=${CLIENT_KEY}`;
            url += `&scope=user.info.basic,video.list,video.upload`;
            url += `&response_type=code`;
            url += `&redirect_uri=${SERVER_ENDPOINT_REDIRECT}`;
            url += `&state=` + csrfState;
            res.redirect(url);
        });
        this.app.get("/redirect", (req, res) => {
            const { code } = req.query;
            let url_access_token = "https://open-api.tiktok.com/oauth/access_token/";
            url_access_token += "?client_key=" + CLIENT_KEY;
            url_access_token += "&client_secret=" + CLIENT_SECRET;
            url_access_token += "&code=" + code;
            url_access_token += "&grant_type=authorization_code";
            fetch(url_access_token, { method: "post" })
                .then((res) => res.json())
                .then((json) => {
                    console.log(json);
                    res.send(json);
                });
        });
        this.app.get("/refresh_token/", (req, res) => {
            const refresh_token = req.query.refresh_token;
            let url_refresh_token = "https://open-api.tiktok.com/oauth/refresh_token/";
            url_refresh_token += "?client_key=" + CLIENT_KEY;
            url_refresh_token += "&grant_type=refresh_token";
            url_refresh_token += "&refresh_token=" + refresh_token;
            fetch(url_refresh_token, { method: "post" })
                .then((res) => res.json())
                .then((json) => {
                    res.send(json);
                });
        });
        //!--------------------------------
    }

    public async startServer() {
        this.runningServer = this.app.listen(this.app.get("port"), "0.0.0.0", () => {
            this.runningServer.timeout = 1000000;
            this.runningServer.keepAliveTimeout = 90000;
            logger.info(`App is running at http://localhost:${this.app.get("port")} in ${this.app.get("env")} mode`);
            logger.info("Press CTRL-C to stop\n");
        });
    }
}
