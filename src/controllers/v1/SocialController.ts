import { Delete, Get, Post, Property, Required, Returns } from "@tsed/schema";
import { Controller, Inject } from "@tsed/di";
import { BodyParams, Context, PathParams, QueryParams } from "@tsed/common";
import { UserService } from "../../services/UserService";
import { SuccessResult } from "../../util/entities";
import { BadRequest, NotFound } from "@tsed/exceptions";
import {
    CAMPAIGN_CLOSED,
    CAMPAIGN_NOT_FOUND,
    GLOBAL_CAMPAIGN_NOT_FOUND,
    MEDIA_NOT_FOUND,
    ORG_NOT_FOUND,
    PARTICIPANT_NOT_FOUND,
    POST_ID_NOT_FOUND,
    USER_NOT_FOUND,
} from "../../util/errors";
import { ParticipantService } from "../../services/ParticipantService";
import { SocialPostService } from "../../services/SocialPostService";
import { calculateParticipantSocialScoreV2, getSocialClient } from "../helpers";
import { BooleanResultModel, SocialMetricsResultModel, SocialPostResultModel } from "../../models/RestModels";
import { Prisma } from "@prisma/client";
import { MediaType, PointValueTypes, SocialType } from "../../types";
import { SocialLinkService } from "../../services/SocialLinkService";
import { CampaignService } from "../../services/CampaignService";
import { CampaignMediaService } from "../../services/CampaignMediaService";
import { downloadMedia } from "../../util";
import { HourlyCampaignMetricsService } from "../../services/HourlyCampaignMetricsService";
import { addMinutes } from "date-fns";
import { BSC, COIIN } from "../../util/constants";
import { TatumClientService } from "../../services/TatumClientService";

class RegisterSocialLinkResultModel {
    @Property() public readonly registerSocialLink: boolean;
}

class RemoveSocialLinkParams {
    @Required() public readonly type: SocialType;
}
class SocialPostTimeResultModel {
    @Property() readonly show_captcha: boolean;
}

class SocialMetricsParams {
    @Required() public readonly id: string;
}

class RegisterSocialLInkParams {
    @Required() public readonly type: SocialType;
    @Required() public readonly apiKey: string;
    @Required() public readonly apiSecret: string;
}

class PostToSocialParams {
    @Required() public readonly socialType: SocialType;
    @Required() public readonly text: string;
    @Required() public readonly participantId: string;
    @Property() public readonly mediaType: MediaType;
    @Property() public readonly mediaFormat: string;
    @Property() public readonly media: string;
    @Property() public readonly mediaId: string;
    @Property() public readonly defaultMedia: boolean;
}

class PostContentGloballyParams {
    @Required() public readonly socialType: SocialType;
    @Required() public readonly text: string;
    @Property() public readonly mediaType: MediaType;
    @Property() public readonly mediaFormat: string;
    @Property() public readonly media: string;
}

const allowedSocialLinks = ["twitter", "facebook", "tiktok"];

const assetUrl =
    process.env.NODE_ENV === "production"
        ? "https://raiinmaker-media.api.raiinmaker.com"
        : "https://raiinmaker-media-staging.api.raiinmaker.com";

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
    @Inject()
    private campaignService: CampaignService;
    @Inject()
    private campaignMediaService: CampaignMediaService;
    @Inject()
    private hourlyCampaignMetricsService: HourlyCampaignMetricsService;
    @Inject()
    private tatumClientService: TatumClientService;

    @Get("/social-metrics")
    @(Returns(200, SuccessResult).Of(SocialMetricsResultModel))
    public async getSocialMetrics(@QueryParams() query: SocialMetricsParams, @Context() context: Context) {
        const user = await this.userService.findUserByContext(context.get("user"));
        if (!user) throw new BadRequest(USER_NOT_FOUND);
        const { id } = query;
        const participant = await this.participantService.findParticipantById(id, { campaign: true });
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
    @(Returns(200, SuccessResult).Of(RegisterSocialLinkResultModel))
    public async registerSocialLink(@BodyParams() body: RegisterSocialLInkParams, @Context() context: Context) {
        const user = await this.userService.findUserByContext(context.get("user"), ["social_link"]);
        if (!user) throw new NotFound(USER_NOT_FOUND);
        const { type, apiKey, apiSecret } = body;
        if (!allowedSocialLinks.includes(type)) throw new BadRequest("The type must exist as a predefined type");
        await this.socialLinkService.addTwitterLink(user, apiKey, apiSecret);
        return new SuccessResult({ registerSocialLink: true }, RegisterSocialLinkResultModel);
    }

    @Post("/post-to-social")
    @(Returns(200, SuccessResult).Of(SocialPostResultModel))
    public async postToSocial(@BodyParams() body: PostToSocialParams, @Context() context: Context) {
        const user = await this.userService.findUserByContext(context.get("user"), ["wallet"]);
        if (!user) throw new NotFound(USER_NOT_FOUND);
        let { socialType, text, mediaType, mediaFormat, media, participantId, defaultMedia, mediaId } = body;
        if (!allowedSocialLinks.includes(socialType)) throw new BadRequest(`posting to ${socialType} is not allowed`);
        const participant = await this.participantService.findParticipantById(participantId, { campaign: true });
        if (!participant) throw new NotFound(PARTICIPANT_NOT_FOUND);
        if (!(await this.campaignService.isCampaignOpen(participant.campaign.id)))
            throw new BadRequest(CAMPAIGN_CLOSED);
        const socialLink = await this.socialLinkService.findSocialLinkByUserId(user.id, socialType);
        if (!socialLink) throw new BadRequest(`You have not linked ${socialType} as a social platform`);
        const campaign = await this.campaignService.findCampaignById(participant.campaign.id, {
            org: true,
            campaign_media: true,
        });
        if (!campaign) throw new NotFound(CAMPAIGN_NOT_FOUND);
        if (!campaign.org) throw new NotFound(ORG_NOT_FOUND);
        const client = getSocialClient(socialType);
        if (defaultMedia) {
            let selectedMedia = await this.campaignMediaService.findCampaignMediaById(mediaId, socialType);
            if (!selectedMedia) throw new NotFound(MEDIA_NOT_FOUND);
            if (!selectedMedia.mediaFormat) throw new BadRequest("Media format is not defined");
            const mediaUrl = `${assetUrl}/campaign/${campaign.id}/${selectedMedia?.media}`;
            const downloaded = await downloadMedia(mediaType, mediaUrl, selectedMedia.mediaFormat!);
            media = downloaded;
            mediaFormat = selectedMedia.mediaFormat;
        }
        let postId: string;
        if (mediaType && mediaFormat) {
            postId = await client.postV2(participant.id, socialLink, text, media, mediaType, mediaFormat);
        } else {
            postId = await client.postV2(participant.id, socialLink, text);
        }
        if (!postId) throw new NotFound(POST_ID_NOT_FOUND);
        await this.hourlyCampaignMetricsService.upsertMetrics(campaign.id, campaign.org.id, "post");

        const socialPost = await this.socialPostService.newSocialPost(
            postId,
            socialType,
            participant.id,
            user.id,
            participant.campaign.id
        );
        const result = { id: socialPost.id };
        return new SuccessResult(result, SocialPostResultModel);
    }

    @Delete("/:type")
    @(Returns(200, SuccessResult).Of(BooleanResultModel))
    public async removeSocialLink(@PathParams() path: RemoveSocialLinkParams, @Context() context: Context) {
        const user = await this.userService.findUserByContext(context.get("user"), ["social_link"]);
        if (!user) throw new NotFound(USER_NOT_FOUND);
        const { type } = path;
        if (!allowedSocialLinks.includes(type)) throw new BadRequest("Invalid or missing params");
        await this.socialLinkService.removeSocialLink(user.id, type);
        return new SuccessResult({ success: true }, BooleanResultModel);
    }

    @Get("/user-social-post-time")
    @(Returns(200, SuccessResult).Of(SocialPostTimeResultModel))
    public async getUserSocialPostTime(@Context() context: Context) {
        const user = await this.userService.findUserByContext(context.get("user"));
        if (!user) throw new NotFound(USER_NOT_FOUND);
        const socialPostTime = await this.socialPostService.findUserSocialPostTime(user.id);
        let show_captcha = false;
        const timeToCompare = addMinutes(new Date(socialPostTime?.createdAt!), 60);
        const currentDate = new Date();
        if (new Date(timeToCompare) > currentDate) show_captcha = true;
        const captchaRequired = { show_captcha };
        return new SuccessResult(captchaRequired, SocialPostTimeResultModel);
    }

    @Post("/post-content-globally")
    @(Returns(200, SuccessResult).Of(BooleanResultModel))
    public async postContentGlobally(@BodyParams() body: PostContentGloballyParams, @Context() context: Context) {
        const user = await this.userService.findUserByContext(context.get("user"), ["wallet"]);
        if (!user) throw new NotFound(USER_NOT_FOUND);
        let { socialType } = body;
        if (!allowedSocialLinks.includes(socialType)) throw new BadRequest(`posting to ${socialType} is not allowed`);
        const globalCampaign = await this.campaignService.findGlobalCampaign(true, COIIN);
        if (!globalCampaign) throw new NotFound(GLOBAL_CAMPAIGN_NOT_FOUND);
        let participant = await this.participantService.findParticipantByUserAndCampaignIds(user.id, globalCampaign.id);
        if (!participant) {
            await this.tatumClientService.findOrCreateCurrency({ symbol: COIIN, network: BSC, wallet: user.wallet! });
            participant = await this.participantService.createNewParticipant(user.id, globalCampaign, user.email);
        }
        await this.postToSocial(
            {
                ...body,
                defaultMedia: false,
                mediaId: "none",
                participantId: participant.id,
            },
            context
        );
        return new SuccessResult({ success: true }, BooleanResultModel);
    }
}
