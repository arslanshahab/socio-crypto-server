import { BigNumber } from "bignumber.js";
import { BN } from "../../util";
import { Participant } from "@prisma/client";
import { Campaign } from "@prisma/client";
import { User } from "@prisma/client";
import { prisma } from "../../clients/prisma";

export class EngagementRate {
    participant: Participant;
    campaign: Campaign;
    user: User;
    potentialEngagement: BigNumber;

    postCount: BigNumber;
    followerCount: BigNumber;
    likeCount: BigNumber;
    shareCount: BigNumber;
    commentCount: BigNumber;

    constructor(participant: Participant, campaign: Campaign, user: User) {
        this.participant = participant;
        this.campaign = campaign;
        this.user = user;
    }

    async getParticipantSocialData() {
        const totalPosts = await prisma.socialPost.count({
            where: { campaignId: this.campaign.id, userId: this.user.id, type: "twitter" },
        });
        this.postCount = new BN(totalPosts);
        const socialLink = await prisma.socialLink.findFirst({ where: { userId: this.user.id, type: "twitter" } });
        this.followerCount = new BN(socialLink?.followerCount || 0);
        const { likeCount, shareCount, commentCount } = await this.getUserTotalSocialEngagement(this.user.id);
        this.potentialEngagement = this.postCount.times(this.followerCount);
        this.likeCount = new BN(likeCount);
        this.shareCount = new BN(shareCount);
        this.commentCount = new BN(commentCount);
    }

    async social() {
        await this.getParticipantSocialData();
        return {
            likeRate: this.likeCount.div(this.potentialEngagement),
            shareRate: this.shareCount.div(this.potentialEngagement),
            commentRate: this.commentCount.div(this.potentialEngagement),
            clickRate: new BN(this.participant.clickCount).div(this.potentialEngagement),
        };
    }

    getUserTotalSocialEngagement = async (userId: string) => {
        const userPosts = await prisma.socialPost.findMany({ where: { userId } });
        const likeCount = userPosts.map((item) => parseFloat(item.likes || "0")).reduce((sum, item) => sum + item, 0);
        const shareCount = userPosts.map((item) => parseFloat(item.shares || "0")).reduce((sum, item) => sum + item, 0);
        const commentCount = userPosts
            .map((item) => parseFloat(item.comments || "0"))
            .reduce((sum, item) => sum + item, 0);
        return { likeCount, shareCount, commentCount };
    };

    views() {
        return new BN(this.participant.clickCount).div(this.participant.viewCount);
    }

    submissions() {
        return new BN(this.participant.clickCount).div(this.participant.submissionCount);
    }
}
