import { Secrets } from "../../util/secrets";
import { Application } from "../../app";
import * as dotenv from "dotenv";
import { payoutCryptoCampaignRewards } from "./auditFunctions";
import { Firebase } from "../../clients/firebase";
import { CampaignAuditStatus, CampaignStatus } from "../../util/constants";
import { readPrisma } from "../../clients/prisma";
import { Dragonchain } from "../../clients/dragonchain";
import { SlackClient } from "../../clients/slack";

dotenv.config();
const app = new Application();
console.log("APP instance created.");

(async () => {
    console.log("Starting campaign audit.");
    await Secrets.initialize();
    await Firebase.initialize();
    await Dragonchain.initialize();
    const connection = await app.connectDatabase();
    console.log("Secrets and connection initialized.");
    const now = new Date();
    try {
        const campaigns = await readPrisma.campaign.findMany({
            where: {
                endDate: { lte: now },
                status: CampaignStatus.APPROVED,
                auditStatus: CampaignAuditStatus.PENDING,
                isGlobal: false,
            },
        });
        console.log(`TOTAL CAMPAIGNS TO BE AUDITED--- ${campaigns.map((item) => item.id)}`);
        for (let index = 0; index < campaigns.length; index++) {
            const campaign = await readPrisma.campaign.findUnique({
                where: {
                    id: campaigns[index].id,
                },
                include: {
                    currency: {
                        include: {
                            token: true,
                        },
                    },
                },
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
            switch (campaign?.type?.toLowerCase()) {
                case "crypto":
                    deviceIds = await payoutCryptoCampaignRewards(campaign);
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
        await SlackClient.sendNotification({ name: "Fix Transfers Cron", error: error });
        console.log("EXITING BECAUSE OF AN ERROR ----.");
        await connection.close();
        console.log("DATABASE CONNECTION CLOSED ----.");
        process.exit(0);
    }
    console.log("COMPLETED CRON TASKS ----.");
    await connection.close();
    console.log("DATABASE CONNECTION CLOSED ----.");
    process.exit(0);
})();
