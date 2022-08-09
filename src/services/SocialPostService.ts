import { Injectable } from "@tsed/di";
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
}
