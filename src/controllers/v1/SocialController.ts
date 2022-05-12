import { Get, Returns } from "@tsed/schema";
import { Controller, Inject } from "@tsed/di";
import { Context, QueryParams } from "@tsed/common";
import { UserService } from "../../services/UserService";
import { SuccessResult } from "../../util/entities";
import { BadRequest, NotFound } from "@tsed/exceptions";
import { PARTICIPANT_NOT_FOUND, USER_NOT_FOUND } from "../../util/errors";
import { ParticipantService } from "../../services/ParticipantService";
import { SocialPostService } from "../../services/SocialPostService";
import { calculateParticipantSocialScoreV2 } from "../helpers";
import { ParticipantQueryParams, SocialMetricsResultModel } from "../../models/RestModels";
import { Campaign, Participant, Prisma, Profile, User } from "@prisma/client";
import { PointValueTypes } from "../../types";

@Controller("/social")
export class SocialController {
    @Inject()
    private participantService: ParticipantService;
    @Inject()
    private socialPostService: SocialPostService;
    @Inject()
    private userService: UserService;

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

    @Get("/user-social-post-time")
    @(Returns(200, SuccessResult).Of(SocialMetricsResultModel))
    public async getUserSocialPostTime(@Context() context: Context) {
        const user = await this.userService.findUserByContext(context.get("user"));
        if (!user) throw new NotFound(USER_NOT_FOUND);
        const socialPostTime = await this.socialPostService.findUserSocialPostTime(user.id);
        if (!socialPostTime) throw new NotFound("No social post found");
        return new SuccessResult(socialPostTime, SocialMetricsResultModel);
    }
}
