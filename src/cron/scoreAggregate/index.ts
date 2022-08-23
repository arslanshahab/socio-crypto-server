import { Application } from "../../app";
import { Firebase } from "../../clients/firebase";
import { Secrets } from "../../util/secrets";
import logger from "../../util/logger";
import * as cron from "./scoreAggregate";
import { SlackClient } from "../../clients/slack";

const app = new Application();

(async () => {
    // create connections
    logger.info("Starting 24 hour cron");
    await Secrets.initialize();
    await Firebase.initialize();
    const connection = await app.connectDatabase();
    try {
        await cron.main();
    } catch (error) {
        console.log(error);
        await SlackClient.sendNotification({ name: "Score Agggregate Cron", error: error });
        console.log("EXITING BECAUSE OF AN ERROR ----.");
        await connection.close();
        console.log("DATABASE CONNECTION CLOSED ----.");
        process.exit(0);
    }
    // cleanup connections
    logger.info("closing connection");
    await connection.close();
    process.exit(0);
})();
