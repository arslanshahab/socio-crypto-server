import { Secrets } from "../../util/secrets";
import { Application } from "../../app";
import * as dotenv from "dotenv";
import { Campaign } from "../../models/Campaign";
import { LessThan, EntityManager } from "typeorm";
import { DateUtils } from "typeorm/util/DateUtils";
import { payoutCryptoCampaignRewards, payoutRaffleCampaignRewards } from "./auditFunctions";
import { Firebase } from "../../clients/firebase";

dotenv.config();
const app = new Application();
console.log("APP instance created.");

(async () => {
    console.log("Starting campaign audit.");
    await Secrets.initialize();
    await Firebase.initialize();
    const connection = await app.connectDatabase();
    console.log("Secrets and connection initialized.");
    try {
        let date = new Date();
        const campaigns = await Campaign.find({
            where: {
                status: "APPROVED",
                auditStatus: "PENDING",
                endDate: LessThan(DateUtils.mixedDateToDatetimeString(date)),
            },
        });
        const entityManager = new EntityManager(connection);
        console.log(`TOTAL CAMPAIGNS TO BE AUDITED--- ${campaigns.map((item) => item.id)}`);
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
                index,
                campaign?.id,
                campaign?.name,
                campaign?.currency?.symbol,
                campaign?.currency?.tatumId,
                campaign?.coiinTotal?.toString(),
                campaign?.tatumBlockageId
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
            try {
                if (deviceIds?.length)
                    await Firebase.sendCampaignCompleteNotifications(Object.values(deviceIds), campaign.name);
            } catch (error) {}
        }
    } catch (error) {
        console.log(error);
        await connection.close();
        process.exit(0);
    }
    await connection.close();
    process.exit(0);
})();
