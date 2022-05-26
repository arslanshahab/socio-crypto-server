import { Connection, In } from "typeorm";
import { connectDatabase } from "../helpers";
import * as dotenv from "dotenv";
import { Secrets } from "../../src/util/secrets";
import { SocialLink } from "../../src/models/SocialLink";
import { TwitterClient } from "../../src/clients/twitter";
import { Campaign } from "../../src/models/Campaign";
import { createObjectCsvWriter } from "csv-writer";
import { Participant } from "../../src/models/Participant";
// import { DateUtils } from "typeorm/util/DateUtils";
import { DailyParticipantMetric } from "../../src/models/DailyParticipantMetric";
import { SocialPost } from "../../src/models/SocialPost";

dotenv.config();

(async () => {
    try {
        console.log("Preparing to fetch participants.");
        await Secrets.initialize();
        const connection: Connection = await connectDatabase();
        // const campaigns = await Campaign.find({
        //     where: {
        //         endDate: MoreThanOrEqual(DateUtils.mixedDateToUtcDatetimeString(new Date())),
        //         status: "APPROVED",
        //         auditStatus: "DEFAULT",
        //         isGlobal: true,
        //     },
        // });
        const campaigns = await Campaign.find({
            where: {
                id: In([
                    "6106006c-3dfe-4ece-a390-73c7e23a7e09",
                    "76295353-8763-436d-a076-77045fd849b3",
                    "999cfb09-dc5f-49ef-816f-d6acd41ef3af",
                ]),
            },
        });
        const csvData = [];
        const csvWriter = createObjectCsvWriter({
            path: "participants-list.csv",
            header: [
                { id: "userId", title: "userId" },
                { id: "username", title: "username" },
                { id: "email", title: "email" },
                { id: "createdAt", title: "createdAt" },
                { id: "lastLogin", title: "lastLogin" },
                { id: "campaignName", title: "campaignName" },
                { id: "twitterUsername", title: "twitterUsername" },
                { id: "totalLikes", title: "totalLikes" },
                { id: "totalShares", title: "totalShares" },
                { id: "likesScore", title: "likesScore" },
                { id: "shareScore", title: "shareScore" },
                { id: "participationScore", title: "participationScore" },
                { id: "selfPostCount", title: "selfPostCount" },
            ],
        });
        for (const campaign of campaigns) {
            const participants = await Participant.find({ where: { campaign }, relations: ["user"] });
            for (const participant of participants) {
                const link = await SocialLink.findOne({ where: { type: "twitter", user: participant.user } });
                let twitterUsername = "";
                try {
                    if (link) twitterUsername = await TwitterClient.getUsername(link);
                    console.log("twitter username fetched ---- ", twitterUsername);
                } catch (error) {}
                const startDate = new Date("2022-04-18");
                const endDate = new Date("2022-05-01");
                const metrics = await DailyParticipantMetric.getAccumulatedParticipantMetricsByRange(
                    startDate,
                    endDate,
                    participant.id
                );
                const postCount = await SocialPost.count({ where: { campaign, participantId: participant.id } });
                csvData.push({
                    userId: participant.user.id,
                    username: participant.user?.profile?.username || "",
                    email: participant.user.email,
                    createdAt: participant.user.createdAt,
                    lastLogin: participant.user.lastLogin,
                    campaignName: campaign.name,
                    twitterUsername,
                    selfPostCount: postCount,
                    totalLikes: metrics.likeCount || 0,
                    totalShares: metrics.shareCount || 0,
                    participationScore: metrics.participationScore || 0,
                });
            }
        }
        await csvWriter.writeRecords(csvData);
        await connection.close();
        process.exit(0);
    } catch (e) {
        console.log("ERROR:", e);
    }
})();
