import { Prisma } from "@prisma/client";
import { Injectable } from "@tsed/di";
import { SocialPostCountReturnTypes } from "types.ts";
import { prisma, readPrisma } from "../clients/prisma";

@Injectable()
export class SocialPostService {
    public async findSocialPostMetricsById(campaignId: string) {
        return readPrisma.socialPost.findMany({
            where: { campaignId },
        });
    }
    public async findSocialPostByParticipantId(participantId: string) {
        return readPrisma.socialPost.findMany({
            where: { participantId },
        });
    }

    public async findSocialPostByCampaignId(campaignId: string, skip?: number, take?: number) {
        return readPrisma.$transaction([
            readPrisma.socialPost.findMany({
                where: { campaignId },
                skip: skip && skip,
                take: take && take,
            }),
            readPrisma.socialPost.count({ where: { campaignId } }),
        ]);
    }

    public async deleteSocialPost(campaignId: string) {
        return await prisma.socialPost.deleteMany({
            where: { campaignId },
        });
    }

    public async newSocialPost(id: string, type: string, participantId: string, userId: string, campaignId: string) {
        return await prisma.socialPost.create({
            data: {
                id,
                type,
                participantId,
                userId,
                campaignId,
            },
        });
    }

    public async findUserSocialPostTime(userId: string) {
        return readPrisma.socialPost.findFirst({
            where: { userId },
            orderBy: { createdAt: "desc" },
            select: {
                createdAt: true,
            },
        });
    }

    public async getSocialPostCount(campaignId?: string, participantId?: string) {
        return readPrisma.socialPost.count({
            where: { campaignId: campaignId && campaignId, participantId: participantId && participantId },
        });
    }

    public async getSocialPostMetrics(campaignId: string) {
        const result: { likes: number; shares: number; comments: number }[] =
            await prisma.$queryRaw`SELECT COALESCE(sum(cast(s."likes" as int)),0) as "likes", 
                COALESCE(sum(cast(s."shares" as int)),0) as "shares", COALESCE(sum(cast(s."comments" as int)),0) as "comments" FROM
                social_post as s left join campaign as c on s."campaignId"=c.id where c.id=${campaignId} group by c.id;`;
        return result;
    }

    public async getSoialPostCount(campaignId?: string, campaignIds?: string[]) {
        // let filterd = campaignId ? `='${campaignId}'` : `in${campaignIds}`;
        let result: SocialPostCountReturnTypes[] = [];
        if (campaignId) {
            result =
                await prisma.$queryRaw`SELECT s.type, COALESCE(sum(cast(s."likes" as int)),0) as "likes", COALESCE(sum(cast(s."shares" as int)),0) as "shares",
            COALESCE(sum(cast(s."comments" as int)),0) as "comments" FROM social_post as s left join campaign as c on s."campaignId"=c.id
            where s."campaignId"=${campaignId} group by s.type;`;
        } else if (campaignIds) {
            result =
                await prisma.$queryRaw`SELECT s.type, COALESCE(sum(cast(s."likes" as int)),0) as "likes", COALESCE(sum(cast(s."shares" as int)),0) as "shares",
        COALESCE(sum(cast(s."comments" as int)),0) as "comments" FROM social_post as s left join campaign as c on s."campaignId"=c.id
        where s."campaignId" in(${Prisma.join(campaignIds)}) group by s.type;`;
        }
        return result;
    }
}
