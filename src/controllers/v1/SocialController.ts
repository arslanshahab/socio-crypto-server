import { Get, Post, Returns } from "@tsed/schema";
import { Controller, Inject } from "@tsed/di";
import { BodyParams, Context, QueryParams } from "@tsed/common";
import { UserService } from "../../services/UserService";
import { SuccessResult } from "../../util/entities";
import { BadRequest, NotFound } from "@tsed/exceptions";
import { PARTICIPANT_NOT_FOUND, USER_NOT_FOUND } from "../../util/errors";
import { ParticipantService } from "../../services/ParticipantService";
import { SocialPostService } from "../../services/SocialPostService";
import { calculateParticipantSocialScoreV2 } from "../helpers";
import { ParticipantQueryParams, SocialMetricsResultModel } from "../../models/RestModels";
import { Campaign, Participant, Prisma, Profile, User } from "@prisma/client";
import { PointValueTypes, SocialType } from "../../types";
import { SocialLinkService } from "../../services/SocialLinkService";

export const allowedSocialLinks = ["twitter", "facebook", "tiktok"];

@Controller("/social")
export class SocialController {
    @Inject()
    private participantService: ParticipantService;
    @Inject()
    private socialPostService: SocialPostService;
    @Inject()
    private userService: UserService;
    @Inject()
    private socialLinkService: SocialLinkService;

    @Get("/social-metrics")
    @(Returns(200, SuccessResult).Of(SocialMetricsResultModel))
    public async getSocialMetrics(@QueryParams() query: ParticipantQueryParams, @Context() context: Context) {
        const user = await this.userService.findUserByContext(context.get("user"));
        if (!user) throw new BadRequest(USER_NOT_FOUND);
        const { id } = query;
        const participant: (Participant & { user: User & { profile: Profile | null }; campaign: Campaign }) | null =
            await this.participantService.findParticipantById(id, user);
        if (!participant) throw new Error(PARTICIPANT_NOT_FOUND);
        const socialPost = await this.socialPostService.findSocialPostByParticipantId(participant.id);
        const metrics = await calculateParticipantSocialScoreV2(
            socialPost,
            (participant.campaign.algorithm as Prisma.JsonObject)
                .pointValues as Prisma.JsonObject as unknown as PointValueTypes
        );
        const result = {
            totalLikes: metrics.totalLikes,
            totalShares: metrics.totalShares,
            likesScore: metrics.likesScore,
            shareScore: metrics.shareScore,
        };
        return new SuccessResult(result, SocialMetricsResultModel);
    }

    @Post("/register-social-link")
    @(Returns(200, SuccessResult).Of(Boolean))
    public async registerSocialLink(
        @BodyParams() query: { type: SocialType; apiKey: string; apiSecret: string },
        @Context() context: Context
    ) {
        const user = await this.userService.findUserByContext(context.get("user"), ["social_link"]);
        if (!user) throw new NotFound(USER_NOT_FOUND);
        const { type, apiKey, apiSecret } = query;
        if (!allowedSocialLinks.includes(type)) throw new BadRequest("the type must exist as a predefined type");
        await this.socialLinkService.addTwitterLink(user, apiKey, apiSecret);
        return new SuccessResult(true, Boolean);
    }
}
