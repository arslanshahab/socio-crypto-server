import logger from "../../util/logger";
import { Secrets } from "../../util/secrets";
import { Application } from "../../app";
import * as dotenv from "dotenv";

dotenv.config();
const app = new Application();

(async () => {
    await Secrets.initialize();
    const connection = await app.connectDatabase();
    try {
        console.log("job started");
    } catch (error) {
        logger.error(`An error occurred: ${error.message || JSON.stringify(error)}`);
    }
    await connection.close();
    process.exit(0);
})();
