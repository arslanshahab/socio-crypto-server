import { Secrets } from "../../util/secrets";
import { Application } from "../../app";
import * as dotenv from "dotenv";
import { Firebase } from "../../clients/firebase";
import { Org } from "../../models/Org";
import { COIIN, BSC, RAIINMAKER_ORG_NAME, COIIN_ALERT_TRIGGER_LIMIT } from "../../util/constants";
import { Currency } from "../../models/Currency";
import { Token } from "../../models/Token";
import { SesClient } from "../../clients/ses";
import { Transfer } from "../../models/Transfer";
import { In } from "typeorm";
import { TatumClient } from "../../clients/tatumClient";

dotenv.config();
const app = new Application();
console.log("APP instance created.");

(async () => {
    console.log("Starting auto coiin transfer.");
    await Secrets.initialize();
    await Firebase.initialize();
    const connection = await app.connectDatabase();
    console.log("Secrets and connection initialized.");
    try {
        const emailAddressList = ["ray@raiinmaker.com", "murad@raiinmaker.com", "ben@raiinmaker.com"];
        const raiinmakerOrg = await Org.findOne({ where: { name: RAIINMAKER_ORG_NAME }, relations: ["wallet"] });
        if (!raiinmakerOrg) throw new Error("Org not found.");
        const raiinmakerCoiinCurrency = await Currency.findOne({
            where: {
                wallet: raiinmakerOrg.wallet,
                token: await Token.findOne({ where: { symbol: COIIN, network: BSC } }),
            },
            relations: ["token"],
        });
        if (!raiinmakerCoiinCurrency) throw new Error("Coiin currency not found for raiinmaker.");
        const balance = await raiinmakerOrg.getAvailableBalance(raiinmakerCoiinCurrency.token);
        if (process.env.NODE_ENV === "production" && balance < COIIN_ALERT_TRIGGER_LIMIT) {
            for (const email of emailAddressList) {
                await SesClient.coiinBalanceAlert(email, balance);
            }
        }
        const failedTransfersCount = await Transfer.count({
            where: {
                status: "FAILED",
                currency: COIIN,
                action: In([
                    "REGISTRATION_REWARD",
                    "CAMPAIGN_REWARD",
                    "SHARING_REWARD",
                    "PARTICIPATION_REWARD",
                    "LOGIN_REWARD",
                ]),
            },
        });
        console.log("FAILED TRANSFERS: ", failedTransfersCount);
        if (failedTransfersCount) {
            const take = 200;
            let skip = 0;
            const paginatedLoop = Math.ceil(failedTransfersCount / take);
            for (let pageIndex = 0; pageIndex < paginatedLoop; pageIndex++) {
                const failedTramsfers = await Transfer.find({
                    where: {
                        status: "FAILED",
                        currency: COIIN,
                        action: In([
                            "REGISTRATION_REWARD",
                            "CAMPAIGN_REWARD",
                            "SHARING_REWARD",
                            "PARTICIPATION_REWARD",
                            "LOGIN_REWARD",
                        ]),
                    },
                    relations: ["wallet"],
                    take,
                    skip,
                });
                for (const transfer of failedTramsfers) {
                    const userCurrency = await TatumClient.findOrCreateCurrency({
                        wallet: transfer.wallet,
                        symbol: COIIN,
                        network: BSC,
                    });
                    try {
                        await TatumClient.transferFunds({
                            senderAccountId: raiinmakerCoiinCurrency.tatumId,
                            recipientAccountId: userCurrency.tatumId,
                            amount: transfer.amount.toString(),
                            recipientNote: "COMPENSATING_FAILED_TRANSFER",
                        });
                        transfer.status = "SUCCEEDED";
                    } catch (error) {}
                    console.log(
                        "TRANSFER FIXED: ",
                        transfer.id,
                        transfer.amount.toString(),
                        transfer.wallet.id,
                        transfer.action
                    );
                    await transfer.save();
                }
            }
            skip += take;
        }
    } catch (error) {
        console.log(error);
        await connection.close();
        console.log("DATABASE CONNECTION CLOSED WITH ERROR ----.");
        process.exit(0);
    }
    console.log("COMPLETED CRON TASKS ----.");
    await connection.close();
    console.log("DATABASE CONNECTION CLOSED ----.");
    process.exit(0);
})();
