import logger from "../../util/logger";
import { Secrets } from "../../util/secrets";
import { Application } from "../../app";
import * as dotenv from "dotenv";
import { Campaign } from "../../models/Campaign";
import { LessThan, EntityManager } from "typeorm";
import { initDateFromParams } from "../../util/date";
import { DateUtils } from "typeorm/util/DateUtils";
import { payoutCoiinCampaignRewards, payoutCryptoCampaignRewards, payoutRaffleCampaignRewards } from "./auditFunctions";
import { Firebase } from "../../clients/firebase";

dotenv.config();
const app = new Application();

(async () => {
    await Secrets.initialize();
    const connection = await app.connectDatabase();
    try {
        let date = initDateFromParams({ date: new Date(), d: new Date().getDate(), h: 0, i: 0, s: 0 });
        const campaigns = await Campaign.find({
            where: [
                { status: "APPROVED", auditStatus: "PENDING" },
                {
                    endDate: LessThan(DateUtils.mixedDateToDatetimeString(date)),
                    auditStatus: "DEFAULT",
                    status: "APPROVED",
                },
            ],
            relations: ["participants", "prize", "org", "org.wallet", "escrow", "crypto"],
        });
        const entityManager = new EntityManager(connection);
        console.log(`TOTAL CAMPAIGNS TO BE AUDITED--- ${campaigns.length}`);
        for (let index = 0; index < campaigns.length; index++) {
            const campaign = campaigns[index];
            let deviceIds;
            switch (campaign.type.toLowerCase()) {
                case "crypto":
                    const symbol = campaign?.crypto?.type || campaign?.symbol;
                    if (!symbol) throw new Error("campaign symbol not defined");
                    if (symbol.toLowerCase() === "coiin") {
                        deviceIds = await payoutCoiinCampaignRewards(entityManager, campaign, []);
                    } else {
                        deviceIds = await payoutCryptoCampaignRewards(campaign);
                    }
                    break;
                case "raffle":
                    deviceIds = await payoutRaffleCampaignRewards(entityManager, campaign, []);
                    break;
                default:
                    throw new Error("campaign type is invalid");
            }
            if (deviceIds) await Firebase.sendCampaignCompleteNotifications(Object.values(deviceIds), campaign.name);
        }
    } catch (error) {
        logger.error(`ERROR---: ${error.message || JSON.stringify(error)}`);
    }
    await connection.close();
    process.exit(0);
})();
