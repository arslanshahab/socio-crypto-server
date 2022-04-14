console.log("IMPORT #1");
import { Secrets } from "../../util/secrets";
console.log("IMPORT #2");
import { Application } from "../../app";
console.log("IMPORT #3");
import * as dotenv from "dotenv";
console.log("IMPORT #4");
import { Campaign } from "../../models/Campaign";
console.log("IMPORT #5");
import { LessThan, EntityManager } from "typeorm";
console.log("IMPORT #6");
import { initDateFromParams } from "../../util/date";
console.log("IMPORT #7");
import { DateUtils } from "typeorm/util/DateUtils";
console.log("IMPORT #8");
import { payoutCryptoCampaignRewards, payoutRaffleCampaignRewards } from "./auditFunctions";
console.log("IMPORT #9");
import { Firebase } from "../../clients/firebase";
console.log("IMPORT #10");

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
        let date = initDateFromParams({ date: new Date(), d: new Date().getDate(), h: 0, i: 0, s: 0 });
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
    }
    await connection.close();
    process.exit(0);
})();
