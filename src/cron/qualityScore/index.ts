import { Application } from "../../app";
import logger from "../../util/logger";
import { Secrets } from "../../util/secrets";
import * as cron from "./qualityScore";

const app = new Application();

(async () => {
    logger.info("Starting quality score cron");
    await Secrets.initialize();
    const connection = await app.connectDatabase();
    await cron.main();
    logger.info("closing connection");
    await connection.close();
    process.exit(0);
})();
