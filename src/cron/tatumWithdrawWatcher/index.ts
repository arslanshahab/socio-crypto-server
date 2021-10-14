import { Secrets } from "../../util/secrets";
import { Application } from "../../app";
import dotenv from "dotenv";
import { TatumClient } from "../../clients/tatumClient";
import logger from "../../util/logger";
if (process.env.LOAD_ENV) {
    dotenv.config();
}

const app = new Application();

(async () => {
    await Secrets.initialize();
    const connection = await app.connectDatabase();
    try {
        let pageSize = 50;
        let offset = 0;
        const pendingWithdrawList = await TatumClient.getPendingWithdrawRequests(pageSize, offset);
        console.log(pendingWithdrawList);
        for (let index = 0; index < pendingWithdrawList.length; index++) {
            const withdraw = pendingWithdrawList[index];
            if (withdraw.status === "InProgress" && withdraw.id && withdraw.txId) {
                await TatumClient.completeWithdraw(withdraw.id, withdraw.txId);
            }
        }
    } catch (error) {
        logger.error(`An error occurred: ${error.message || JSON.stringify(error)}`);
    }
    await connection.close();
    process.exit(0);
})();
