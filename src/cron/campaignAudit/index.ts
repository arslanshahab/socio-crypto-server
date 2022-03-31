import logger from "../../util/logger";
import { Secrets } from "../../util/secrets";
import { Application } from "../../app";
import * as dotenv from "dotenv";
import { Campaign } from "../../models/Campaign";
import { LessThan, EntityManager } from "typeorm";
import { initDateFromParams } from "../../util/date";
import { DateUtils } from "typeorm/util/DateUtils";
import { payoutCryptoCampaignRewards, payoutRaffleCampaignRewards } from "./auditFunctions";
import { Firebase } from "../../clients/firebase";

dotenv.config();
const app = new Application();

(async () => {
    console.log("Starting campaign audit.");
    await Secrets.initialize();
    const connection = await app.connectDatabase();
    console.log("Secrets and connection initialized.");
    try {
        let date = initDateFromParams({ date: new Date(), d: new Date().getDate(), h: 0, i: 0, s: 0 });
        const campaigns = await Campaign.find({
            where: {
                status: "APPROVED",
                auditStatus: "PENDING",
                endDate: LessThan(DateUtils.mixedDateToDatetimeString(date)),
            },
        });
        const entityManager = new EntityManager(connection);
        console.log(`TOTAL CAMPAIGNS TO BE AUDITED--- ${campaigns.length}`);
        for (let index = 0; index < campaigns.length; index++) {
            const campaign = await Campaign.findOne({
                where: {
                    id: campaigns[index].id,
                },
                relations: ["participants", "prize", "currency", "org"],
            });
            if (!campaign) throw new Error("Campaign not found.");
            console.log(
                "CAMPAIGN DATA ---",
                campaign.id,
                campaign.name,
                campaign?.currency?.symbol,
                campaign.coiinTotal.toString(),
                campaign.tatumBlockageId
            );
            let deviceIds;
            switch (campaign.type.toLowerCase()) {
                case "crypto":
                    deviceIds = await payoutCryptoCampaignRewards(campaign);
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
