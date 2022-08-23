import { Application } from "../../app";
import logger from "../../util/logger";
import { Secrets } from "../../util/secrets";
import * as cron from "./qualityScore";
import { SlackClient } from "../../clients/slack";

const app = new Application();

(async () => {
    logger.info("Starting quality score cron");
    await Secrets.initialize();
    const connection = await app.connectDatabase();
    try {
        await cron.main();
    } catch (error) {
        console.log(error);
        await SlackClient.sendNotification({ name: "Quality Score Cron", error: error });
        console.log("EXITING BECAUSE OF AN ERROR ----.");
        await connection.close();
        console.log("DATABASE CONNECTION CLOSED ----.");
        process.exit(0);
    }
    logger.info("closing connection");
    await connection.close();
    process.exit(0);
})();
