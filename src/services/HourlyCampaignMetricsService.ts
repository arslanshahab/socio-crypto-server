import { Injectable } from "@tsed/di";
import { BadRequest } from "@tsed/exceptions";
import { prisma,readPrisma } from "../clients/prisma";

@Injectable()
export class HourlyCampaignMetricsService {
    public async findCampaignHourlyMetricsByCampaignId(campaignId: string) {
        return readPrisma.hourlyCampaignMetric.findMany({
            where: { campaignId },
        });
    }

    public async deleteCampaignHourlyMetrics(campaignId: string) {
        return await prisma.hourlyCampaignMetric.deleteMany({
            where: { campaignId },
        });
    }

    public async findMetricsByCampaignId(campaignId: string, createdDate: string) {
        return readPrisma.hourlyCampaignMetric.findFirst({
            where: { campaignId, createdAt: { gt: new Date(createdDate) } },
        });
    }

    public async upsertMetrics(
        campaignId: string,
        orgId: string,
        action:
            | "clicks"
            | "views"
            | "submissions"
            | "likes"
            | "shares"
            | "comments"
            | "participate"
            | "removeParticipant"
            | "post",
        actionCount = 1
    ) {
        if (
            ![
                "clicks",
                "views",
                "submissions",
                "likes",
                "shares",
                "comments",
                "participate",
                "post",
                "removeParticipant",
            ].includes(action)
        )
            throw new BadRequest("action not supported");
        const currentDate = new Date();
        const month =
            currentDate.getUTCMonth() + 1 < 10 ? `0${currentDate.getUTCMonth() + 1}` : currentDate.getUTCMonth() + 1;
        const day = currentDate.getUTCDate() < 10 ? `0${currentDate.getUTCDate()}` : currentDate.getUTCDate();
        const hour = currentDate.getUTCHours() < 10 ? `0${currentDate.getUTCHours()}` : currentDate.getUTCHours();
        const yyymmddhh = `${currentDate.getUTCFullYear()}-${month}-${day} ${hour}:00:00`;
        let record = await this.findMetricsByCampaignId(campaignId, yyymmddhh);
        if (!record) {
            record = await prisma.hourlyCampaignMetric.create({
                data: {
                    campaignId,
                    orgId,
                },
            });
        }
        if (action === "clicks") {
            record = await prisma.hourlyCampaignMetric.upsert({
                where: { id: record.id },
                update: {
                    clickCount: (parseInt(record.clickCount) + actionCount).toString(),
                },
                create: {
                    clickCount: actionCount.toString(),
                },
            });
        }
        if (action === "views") {
            record = await prisma.hourlyCampaignMetric.upsert({
                where: { id: record.id },
                update: {
                    viewCount: (parseInt(record.viewCount!) + actionCount).toString(),
                },
                create: {
                    viewCount: actionCount.toString(),
                },
            });
        }
        if (action === "submissions") {
            record = await prisma.hourlyCampaignMetric.upsert({
                where: { id: record.id },
                update: {
                    submissionCount: (parseInt(record.submissionCount) + actionCount).toString(),
                },
                create: {
                    submissionCount: actionCount.toString(),
                },
            });
        }
        if (action === "likes") {
            record = await prisma.hourlyCampaignMetric.upsert({
                where: { id: record.id },
                update: {
                    likeCount: (parseInt(record.likeCount) + actionCount).toString(),
                },
                create: {
                    likeCount: actionCount.toString(),
                },
            });
        }
        if (action === "shares") {
            record = await prisma.hourlyCampaignMetric.upsert({
                where: { id: record.id },
                update: {
                    shareCount: (parseInt(record.shareCount) + actionCount).toString(),
                },
                create: {
                    shareCount: actionCount.toString(),
                },
            });
        }
        if (action === "comments") {
            record = await prisma.hourlyCampaignMetric.upsert({
                where: { id: record.id },
                update: {
                    commentCount: (parseInt(record.commentCount) + actionCount).toString(),
                },
                create: {
                    commentCount: actionCount.toString(),
                },
            });
        }
        if (action === "participate") {
            record = await prisma.hourlyCampaignMetric.upsert({
                where: { id: record.id },
                update: {
                    participantCount: (parseInt(record.participantCount) + actionCount).toString(),
                },
                create: {
                    participantCount: actionCount.toString(),
                },
            });
        }
        if (action === "post") {
            record = await prisma.hourlyCampaignMetric.upsert({
                where: { id: record.id },
                update: {
                    postCount: (parseInt(record.postCount) + actionCount).toString(),
                },
                create: {
                    postCount: actionCount.toString(),
                },
            });
        }
        if (action === "removeParticipant") {
            if (record.participantCount) {
                record = await prisma.hourlyCampaignMetric.update({
                    where: { id: record.id },
                    data: {
                        participantCount: (parseInt(record.participantCount) - 1).toString(),
                    },
                });
            }
        }
        return record;
    }
}
