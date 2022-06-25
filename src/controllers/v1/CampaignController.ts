import { Campaign, CampaignMedia, Prisma } from "@prisma/client";
import { Get, Property, Required, Enum, Returns, Post, Put, ArrayOf } from "@tsed/schema";
import { Controller, Inject } from "@tsed/di";
import { Context, BodyParams, PathParams, QueryParams } from "@tsed/common";
import { CampaignService } from "../../services/CampaignService";
import { UserService } from "../../services/UserService";
import { CampaignState, CampaignStatus, RAIINMAKER_ORG_NAME } from "../../util/constants";
import { calculateParticipantPayoutV2, calculateParticipantSocialScoreV2 } from "../helpers";
import {
    ADMIN_NOT_FOUND,
    CAMPAIGN_NAME_EXISTS,
    CAMPAIGN_NOT_FOUND,
    CAMPAIGN_ORGANIZATION_MISSING,
    COMPANY_NOT_SPECIFIED,
    ORG_NOT_FOUND,
    RAFFLE_PRIZE_MISSING,
    WALLET_NOT_FOUND,
} from "../../util/errors";
import { PaginatedVariablesModel, Pagination, SuccessResult, SuccessArrayResult } from "../../util/entities";
import {
    CampaignMetricsResultModel,
    CampaignResultModel,
    CreateCampaignResultModel,
    CurrentCampaignTierModel,
    DeleteCampaignResultModel,
    GenerateCampaignAuditReportResultModel,
    MediaUrlsModel,
    UpdateCampaignResultModel,
    UpdatedResultModel,
    CampaignIdModel,
    CampaignStatsResultModelArray,
    BooleanResultModel,
} from "../../models/RestModels";
import { BadRequest, NotFound } from "@tsed/exceptions";
import { ParticipantService } from "../../services/ParticipantService";
import { SocialPostService } from "../../services/SocialPostService";
import { CampaignAuditStatus, CampaignCreateTypes, PointValueTypes } from "../../types";
import { addYears } from "date-fns";
import { Validator } from "../../schemas";
import { OrganizationService } from "../../services/OrganizationService";
import { WalletService } from "../../services/WalletService";
import { S3Client } from "../../clients/s3";
import { User } from "../../models/User";
import { Firebase } from "../../clients/firebase";
import { RafflePrizeService } from "../../services/RafflePrizeService";
import { DailyParticipantMetricService } from "../../services/DailyParticipantMetricService";
import { CampaignMediaService } from "../../services/CampaignMediaService";
import { HourlyCampaignMetricsService } from "../../services/HourlyCampaignMetricsService";
import { TransferService } from "../../services/TransferService";
import { EscrowService } from "../../services/EscrowService";
import { CampaignTemplateService } from "../../services/CampaignTemplateService";
import { TatumClientService } from "../../services/TatumClientService";
import { MarketDataService } from "../../services/MarketDataService";

const validator = new Validator();

class ListCampaignsVariablesModel extends PaginatedVariablesModel {
    @Required() @Enum(CampaignState) public readonly state: CampaignState;
    @Property() @Enum(CampaignStatus, "ALL") public readonly status: CampaignStatus | "ALL" | undefined;
    @Property(Boolean) public readonly userRelated: boolean | undefined;
    @Property(String) public readonly auditStatus: CampaignAuditStatus | undefined;
}

class AdminUpdateCampaignStatusParams {
    @Required() @Property(String) public readonly campaignId: string;
    @Required() @Property(String) public readonly status: CampaignStatus;
}

class PayoutCampaignRewardsParams {
    @Required() public readonly campaignId: string;
    @ArrayOf(String) public readonly rejected: string[] | undefined;
}

@Controller("/campaign")
export class CampaignController {
    @Inject()
    private campaignService: CampaignService;
    @Inject()
    private participantService: ParticipantService;
    @Inject()
    private socialPostService: SocialPostService;
    @Inject()
    private organizationService: OrganizationService;
    @Inject()
    private walletService: WalletService;
    @Inject()
    private rafflePrizeService: RafflePrizeService;
    @Inject()
    private dailyParticipantMetricService: DailyParticipantMetricService;
    @Inject()
    private campaignMediaservice: CampaignMediaService;
    @Inject()
    private hourlyCampaignMetricsService: HourlyCampaignMetricsService;
    @Inject()
    private transferService: TransferService;
    @Inject()
    private escrowService: EscrowService;
    @Inject()
    private campaignTemplateService: CampaignTemplateService;
    @Inject()
    private userService: UserService;
    @Inject()
    private tatumClientService: TatumClientService;
    @Inject()
    private marketDataService: MarketDataService;

    @Get()
    @(Returns(200, SuccessResult).Of(Pagination).Nested(CampaignResultModel))
    public async list(@QueryParams() query: ListCampaignsVariablesModel, @Context() context: Context) {
        const user = await this.userService.findUserByContext(context.get("user"));
        const [items, total] = await this.campaignService.findCampaignsByStatus(query, user || undefined);
        const modelItems = await Promise.all(
            items.map(async (i) => {
                const campaignTokenValueInUSD = await this.marketDataService.getTokenValueInUSD(
                    i.currency?.token?.symbol || "",
                    parseFloat(i.coiinTotal)
                );
                return CampaignResultModel.build(i, campaignTokenValueInUSD);
            })
        );
        return new SuccessResult(new Pagination(modelItems, total, CampaignResultModel), Pagination);
    }

    @Get("/one/:id")
    @(Returns(200, SuccessResult).Of(CampaignResultModel))
    public async getOne(@PathParams("id") id: string) {
        const campaign = await this.campaignService.findCampaignById(id, {
            currency: { include: { token: true } },
            crypto_currency: true,
            campaign_media: true,
            campaign_template: true,
        });
        if (!campaign) throw new NotFound(CAMPAIGN_NOT_FOUND);
        const campaignTokenValueInUSD = await this.marketDataService.getTokenValueInUSD(
            campaign.currency?.token?.symbol || "",
            parseFloat(campaign.coiinTotal)
        );
        return new SuccessResult(
            await CampaignResultModel.build(campaign, campaignTokenValueInUSD),
            CampaignResultModel
        );
    }

    @Get("/current-campaign-tier")
    @(Returns(200, SuccessResult).Of(CurrentCampaignTierModel))
    public async getCurrentCampaignTier(@QueryParams() query: CampaignIdModel, @Context() context: Context) {
        const { campaignId } = query;
        const campaignTier = await this.campaignService.currentCampaignTier(campaignId);
        return new SuccessResult(campaignTier, CurrentCampaignTierModel);
    }

    @Get("/campaign-metrics")
    @(Returns(200, SuccessResult).Of(CampaignMetricsResultModel))
    public async getCampaignMetrics(@QueryParams() query: CampaignIdModel, @Context() context: Context) {
        this.userService.checkPermissions({ hasRole: ["admin"] }, context.get("user"));
        const { campaignId } = query;
        const participant = await this.participantService.findParticipants(campaignId);
        const clickCount = participant.reduce((sum, item) => sum + parseInt(item.clickCount), 0);
        const viewCount = participant.reduce((sum, item) => sum + parseInt(item.viewCount), 0);
        const submissionCount = participant.reduce((sum, item) => sum + parseInt(item.submissionCount), 0);
        const participantCount = participant.length;
        const socialPostMetrics = await this.socialPostService.findSocialPostMetricsById(campaignId);
        const likeCount = socialPostMetrics.reduce((sum, item) => sum + parseInt(item.likes), 0);
        const commentCount = socialPostMetrics.reduce((sum, item) => sum + parseInt(item.comments), 0);
        const shareCount = socialPostMetrics.reduce((sum, item) => sum + parseInt(item.shares), 0);
        const socialPostCount = socialPostMetrics.length;

        const metrics = {
            clickCount: clickCount || 0,
            viewCount: viewCount || 0,
            submissionCount: submissionCount || 0,
            likeCount: likeCount || 0,
            commentCount: commentCount || 0,
            shareCount: shareCount || 0,
            participantCount,
            postCount: socialPostCount,
        };
        return new SuccessResult(metrics, CampaignMetricsResultModel);
    }

    @Post("/create-campaign")
    @(Returns(200, SuccessResult).Of(CreateCampaignResultModel))
    public async createCampaign(@BodyParams() body: CampaignCreateTypes, @Context() context: Context) {
        const { role, company } = this.userService.checkPermissions(
            { hasRole: ["admin", "manager"] },
            context.get("user")
        );

        let {
            name,
            beginDate,
            endDate,
            coiinTotal,
            target,
            description,
            instructions,
            algorithm,
            targetVideo,
            imagePath,
            tagline,
            requirements,
            suggestedPosts,
            suggestedTags,
            keywords,
            type = "crypto",
            raffle_prize,
            symbol,
            network,
            campaignType,
            socialMediaType,
            campaignMedia,
            campaignTemplates,
            isGlobal,
            showUrl,
        } = body;

        if (isGlobal) {
            if (await this.campaignService.findGlobalCampaign(isGlobal, symbol))
                throw new BadRequest("Global campaign already exists");
            endDate = addYears(new Date(endDate), 100);
        }
        validator.validateAlgorithmCreateSchema(algorithm);
        if (!!requirements) validator.validateCampaignRequirementsSchema(requirements);
        if (type === "raffle") {
            if (!raffle_prize) throw new BadRequest(RAFFLE_PRIZE_MISSING);
            validator.validateRafflePrizeSchema(raffle_prize);
        }
        if (role === "admin" && !body.company) throw new NotFound(COMPANY_NOT_SPECIFIED);
        const campaignCompany = role === "admin" ? body.company : company;
        if (!campaignCompany) throw new NotFound(COMPANY_NOT_SPECIFIED);
        const org = await this.organizationService.findOrganizationByCompanyName(company!);
        if (!org) throw new NotFound(ORG_NOT_FOUND);
        const wallet = await this.walletService.findWalletByOrgId(org.id);
        if (!wallet) throw new NotFound(WALLET_NOT_FOUND);
        let currency;
        if (type === "crypto") {
            currency = await this.tatumClientService.findOrCreateCurrency({ symbol, network, wallet });
        }
        const existingCampaign = await this.campaignService.findCampaingByName(name);
        if (existingCampaign) throw new BadRequest(CAMPAIGN_NAME_EXISTS);
        const campaign = await this.campaignService.createCampaign(
            name,
            beginDate,
            endDate,
            coiinTotal,
            target,
            description,
            instructions,
            campaignCompany,
            symbol,
            algorithm,
            tagline,
            requirements,
            suggestedPosts,
            suggestedTags,
            keywords,
            type,
            imagePath,
            campaignType,
            socialMediaType,
            isGlobal,
            showUrl,
            targetVideo,
            org,
            currency,
            campaignMedia,
            campaignTemplates
        );
        let campaignImageSignedURL = "";
        let raffleImageSignedURL = "";
        let mediaUrls: MediaUrlsModel[] = [];
        if (imagePath) {
            campaignImageSignedURL = await S3Client.generateCampaignSignedURL(`campaign/${campaign?.id}/${imagePath}`);
        }
        if (type === "raffle") {
            const prize = await this.rafflePrizeService.createRafflePrize(campaign, raffle_prize);
            if (raffle_prize.image) {
                raffleImageSignedURL = await S3Client.generateCampaignSignedURL(
                    `rafflePrize/${campaign.id}/${prize.id}`
                );
            }
        }
        if (campaignMedia.length) {
            campaignMedia.forEach(async (item: CampaignMedia) => {
                if (item.media && item.mediaFormat) {
                    let urlObject: {
                        name: string;
                        channel: string | null;
                        signedUrl: string;
                    } = { name: "", channel: "", signedUrl: "" };
                    urlObject.signedUrl = await S3Client.generateCampaignSignedURL(
                        `campaign/${campaign.id}/${item.media}`
                    );
                    urlObject.name = item.media;
                    urlObject.channel = item.channel;
                    mediaUrls.push(urlObject);
                }
            });
        }
        const deviceTokens = await User.getAllDeviceTokens("campaignCreate");
        if (deviceTokens.length > 0) await Firebase.sendCampaignCreatedNotifications(deviceTokens, campaign);
        const result = {
            campaignId: campaign.id,
            campaignImageSignedURL: campaignImageSignedURL,
            raffleImageSignedURL: raffleImageSignedURL,
            mediaUrls: mediaUrls,
        };
        return new SuccessResult(result, CreateCampaignResultModel);
    }

    @Post("/update-campaign")
    @(Returns(200, SuccessResult).Of(UpdateCampaignResultModel))
    public async updateCampaign(@BodyParams() body: CampaignCreateTypes, @Context() context: Context) {
        const { role, company } = this.userService.checkPermissions(
            { hasRole: ["admin", "manager"] },
            context.get("user")
        );
        let {
            id,
            name,
            beginDate,
            endDate,
            target,
            description,
            instructions,
            algorithm,
            targetVideo,
            imagePath,
            tagline,
            requirements,
            suggestedPosts,
            suggestedTags,
            keywords,
            type = "crypto",
            raffle_prize,
            campaignType,
            socialMediaType,
            campaignMedia,
            campaignTemplates,
            showUrl,
        } = body;
        validator.validateAlgorithmCreateSchema(algorithm);
        if (!!requirements) validator.validateCampaignRequirementsSchema(requirements);
        if (type === "raffle") {
            if (!raffle_prize) throw new BadRequest(RAFFLE_PRIZE_MISSING);
            validator.validateRafflePrizeSchema(raffle_prize);
        }
        if (role === "admin" && !body.company) throw new NotFound(COMPANY_NOT_SPECIFIED);
        if (!company) throw new NotFound(COMPANY_NOT_SPECIFIED);
        const org = await this.organizationService.findOrganizationByCompanyName(company);
        if (!org) throw new NotFound(ORG_NOT_FOUND);
        const campaign: Campaign | null = await this.campaignService.findCampaignById(id);
        if (!campaign) throw new NotFound(CAMPAIGN_NOT_FOUND);
        let campaignImageSignedURL = "";
        const mediaUrls: { name: string | null; channel: string | null; signedUrl: string }[] = [];
        if (imagePath && campaign.imagePath !== imagePath) {
            imagePath;
            campaignImageSignedURL = await S3Client.generateCampaignSignedURL(`campaign/${campaign.id}/${imagePath}`);
        }
        if (campaignTemplates) {
            for (let i = 0; i < campaignTemplates.length; i++) {
                const receivedTemplate = campaignTemplates[i];
                if (receivedTemplate.id) {
                    const foundTemplate = await this.campaignTemplateService.findCampaignTemplateById(
                        receivedTemplate.id
                    );
                    if (foundTemplate) {
                        await this.campaignTemplateService.updateCampaignTemplate(receivedTemplate);
                    }
                } else {
                    await this.campaignTemplateService.updateNewCampaignTemplate(receivedTemplate, campaign.id);
                }
            }
        }
        if (campaignMedia) {
            for (let i = 0; i < campaignMedia.length; i++) {
                const receivedMedia = campaignMedia[i];
                if (receivedMedia.id) {
                    const foundMedia = await this.campaignMediaservice.findCampaignMediaById(receivedMedia.id);
                    if (foundMedia && foundMedia.media !== receivedMedia.media) {
                        await this.campaignMediaservice.updateCampaignMedia(receivedMedia);
                        const urlObject = { name: receivedMedia.media, channel: receivedMedia.channel, signedUrl: "" };
                        urlObject.signedUrl = await S3Client.generateCampaignSignedURL(
                            `campaign/${campaign.id}/${receivedMedia.media}`
                        );
                        mediaUrls.push(urlObject);
                    }
                } else {
                    const urlObject = { name: receivedMedia.media, channel: receivedMedia.channel, signedUrl: "" };
                    urlObject.signedUrl = await S3Client.generateCampaignSignedURL(
                        `campaign/${campaign.id}/${receivedMedia.media}`
                    );
                    mediaUrls.push(urlObject);
                    await this.campaignMediaservice.updateNewCampaignMedia(receivedMedia, campaign.id);
                }
            }
        }
        await this.campaignService.updateCampaign(
            id,
            name,
            beginDate,
            endDate,
            target,
            description,
            instructions,
            algorithm,
            targetVideo,
            imagePath,
            tagline,
            requirements,
            suggestedPosts,
            suggestedTags,
            keywords,
            campaignType,
            socialMediaType,
            showUrl
        );
        const result = {
            campaignId: campaign.id,
            campaignImageSignedURL,
            mediaUrls,
        };
        return new SuccessResult(result, UpdateCampaignResultModel);
    }

    @Post("/delete-campaign")
    @(Returns(200, SuccessResult).Of(DeleteCampaignResultModel))
    public async deleteCampaign(@QueryParams() query: CampaignIdModel, @Context() context: Context) {
        const { campaignId } = query;
        const { company } = this.userService.checkPermissions({ hasRole: ["admin", "manager"] }, context.get("user"));

        const socialPost = await this.socialPostService.findSocialPostByCampaignId(campaignId);
        if (socialPost.length > 0) this.socialPostService.deleteSocialPost(campaignId);
        const payouts = await this.transferService.findTransferByCampaignId(campaignId);
        if (payouts.length > 0) this.transferService.deleteTransferPayouts(campaignId);
        const rafflePrize = await this.rafflePrizeService.findRafflePrizeByCampaignId(campaignId);
        if (rafflePrize.length > 0) this.rafflePrizeService.deleteRafflePrize(campaignId);
        const escrow = await this.escrowService.findEscrowByCampaignId(campaignId);
        if (escrow.length > 0) this.escrowService.deleteEscrow(campaignId);
        const participant = await this.participantService.findParticipantByCampaignId(campaignId);
        if (participant) this.participantService.deleteParticipant(campaignId);
        const dailyParticipantMetrics = await this.dailyParticipantMetricService.findDailyParticipantByCampaignId(
            campaignId
        );
        const dailyParticipantMetricsIds = dailyParticipantMetrics.map((x) => x.id);
        await this.dailyParticipantMetricService.deleteDailyParticipantMetrics(dailyParticipantMetricsIds);
        const hourlyMetrics = await this.hourlyCampaignMetricsService.findCampaignHourlyMetricsByCampaignId(campaignId);
        if (hourlyMetrics.length > 0) this.hourlyCampaignMetricsService.deleteCampaignHourlyMetrics(campaignId);
        const campaignTemplate = await this.campaignTemplateService.findCampaignTemplateByCampaignId(campaignId);
        if (campaignTemplate.length > 0) this.campaignTemplateService.deleteCampaignTemplate(campaignId);
        const campaignMedia = await this.campaignMediaservice.findCampaignMediaByCampaignId(campaignId);
        if (campaignMedia.length > 0) this.campaignMediaservice.deleteCampaignMedia(campaignId);
        const campaign = await this.campaignService.findCampaignById(campaignId, undefined, company);
        if (campaign) this.campaignService.deleteCampaign(campaignId);
        const result = {
            campaignId: campaign?.id,
            name: campaign?.name,
        };
        return new SuccessResult(result, DeleteCampaignResultModel);
    }
    @Post("/payout-campaign-rewards")
    @(Returns(200, SuccessResult).Of(UpdatedResultModel))
    public async payoutCampaignRewards(@QueryParams() query: PayoutCampaignRewardsParams, @Context() context: Context) {
        const { company } = this.userService.checkPermissions({ hasRole: ["admin", "manager"] }, context.get("user"));
        const { campaignId } = query;
        const campaign = await this.campaignService.findCampaignById(campaignId, undefined, company);
        if (!campaign) throw new NotFound(CAMPAIGN_NOT_FOUND);
        await this.campaignService.updateCampaignStatus(campaignId);
        return new SuccessResult({ message: "Campaign has been submitted for auditting" }, UpdatedResultModel);
    }
    @Post("/generate-campaign-audit-report")
    @(Returns(200, SuccessResult).Of(GenerateCampaignAuditReportResultModel))
    public async generateCampaignAuditReport(@QueryParams() query: CampaignIdModel, @Context() context: Context) {
        const { company } = this.userService.checkPermissions({ hasRole: ["admin", "manager"] }, context.get("user"));
        let { campaignId } = query;
        const campaign = await this.campaignService.findCampaignById(campaignId, { participant: true }, company);
        if (!campaign) throw new NotFound(CAMPAIGN_NOT_FOUND);
        campaignId = campaign.id;
        const { currentTotal } = await this.campaignService.currentCampaignTier(campaignId);
        const totalRewards = campaign.type !== "coiin" ? 0 : currentTotal;
        const auditReport = {
            totalClicks: 0,
            totalViews: 0,
            totalSubmissions: 0,
            totalLikes: 0,
            totalShares: 0,
            totalParticipationScore: parseInt(campaign.totalParticipationScore),
            totalRewardPayout: totalRewards,
        };
        const flaggedParticipants = [];
        for (const participant of campaign.participant) {
            const socialPost = await this.socialPostService.findSocialPostByParticipantId(participant.id);
            const pointValues = (campaign.algorithm as Prisma.JsonObject).pointValues as unknown as PointValueTypes;
            const { totalLikes, totalShares } = await calculateParticipantSocialScoreV2(socialPost, pointValues);
            auditReport.totalShares = auditReport.totalShares + totalShares;
            auditReport.totalLikes = auditReport.totalLikes + totalLikes;
            auditReport.totalClicks = auditReport.totalClicks + parseInt(participant.clickCount);
            auditReport.totalViews = auditReport.totalViews + parseInt(participant.viewCount);
            auditReport.totalSubmissions = auditReport.totalSubmissions + parseInt(participant.submissionCount);
            const totalParticipantPayout = await calculateParticipantPayoutV2(totalRewards, campaign, participant);
            const condition =
                campaign.type === "raffle"
                    ? parseInt(participant.participationScore) > auditReport.totalParticipationScore * 0.15
                    : totalParticipantPayout > auditReport.totalRewardPayout * 0.15;
            if (condition) {
                flaggedParticipants.push({
                    participantId: participant.id,
                    viewPayout: parseInt(participant.viewCount) * pointValues.views,
                    clickPayout: parseInt(participant.clickCount) * pointValues.clicks,
                    submissionPayout: parseInt(participant.submissionCount) * pointValues.submissions,
                    likesPayout: totalLikes * pointValues.likes,
                    sharesPayout: totalShares * pointValues.shares,
                    totalPayout: totalParticipantPayout,
                });
            }
        }
        const report = { ...auditReport, flaggedParticipants };
        for (const key in report) {
            if (key === "flaggedParticipants") {
                for (const flagged of report[key]) {
                    for (const value in flagged) {
                        if (typeof value === "number") {
                            flagged[value] = flagged[value];
                        }
                    }
                }
            }
        }

        return new SuccessResult(report, GenerateCampaignAuditReportResultModel);
    }

    @Get("/dashboard-metrics/:campaignId")
    @(Returns(200, SuccessResult).Of(CampaignStatsResultModelArray))
    public async getDashboardMetrics(@PathParams() query: CampaignIdModel, @Context() context: Context) {
        const admin = await this.userService.findUserByFirebaseId(context.get("user").firebaseId);
        if (!admin) throw new NotFound(ADMIN_NOT_FOUND);
        const { campaignId } = query;
        let campaignMetrics;
        let aggregatedCampaignMetrics;
        let totalParticipants;
        let calculateCampaignMetrics = [];
        if (campaignId === "-1") {
            aggregatedCampaignMetrics = await this.dailyParticipantMetricService.getAggregatedOrgMetrics();
            aggregatedCampaignMetrics = aggregatedCampaignMetrics.reduce(
                (acc, curr) => {
                    acc.clickCount += parseInt(curr.clickCount);
                    acc.viewCount += parseInt(curr.viewCount);
                    acc.shareCount += parseInt(curr.shareCount);
                    acc.participationScore += parseInt(curr.participationScore);
                    return acc;
                },
                {
                    clickCount: 0,
                    viewCount: 0,
                    shareCount: 0,
                    participationScore: 0,
                }
            );
            aggregatedCampaignMetrics = { ...aggregatedCampaignMetrics, campaignName: "All" };
            const campaigns = await this.campaignService.findCampaignsByOrgId(admin.orgId!);
            for (let i = 0; i < campaigns.length; i++) {
                const campaignId = campaigns[i].id;
                campaignMetrics = await this.dailyParticipantMetricService.getOrgMetrics(campaignId);
                campaignMetrics = campaignMetrics.reduce(
                    (acc, curr) => {
                        acc.clickCount += parseInt(curr.clickCount);
                        acc.viewCount += parseInt(curr.viewCount);
                        acc.shareCount += parseInt(curr.shareCount);
                        acc.participationScore += parseInt(curr.participationScore);
                        return acc;
                    },
                    {
                        clickCount: 0,
                        viewCount: 0,
                        shareCount: 0,
                        participationScore: 0,
                    }
                );
                calculateCampaignMetrics.push(campaignMetrics);
            }

            totalParticipants = await this.participantService.findParticipantsCount();
        }
        if (campaignId !== "-1") {
            const participantMetrics = await this.dailyParticipantMetricService.getAggregatedOrgMetrics(campaignId);
            aggregatedCampaignMetrics = participantMetrics.reduce(
                (acc, curr) => {
                    acc.clickCount += parseInt(curr.clickCount);
                    acc.viewCount += parseInt(curr.viewCount);
                    acc.shareCount += parseInt(curr.shareCount);
                    acc.participationScore += parseInt(curr.participationScore);
                    return acc;
                },
                {
                    clickCount: 0,
                    viewCount: 0,
                    shareCount: 0,
                    participationScore: 0,
                }
            );
            const campaignName = await this.campaignService.findCampaignById(campaignId);
            aggregatedCampaignMetrics = {
                ...aggregatedCampaignMetrics,
                campaignName: campaignName?.name,
            };
            campaignMetrics = await this.dailyParticipantMetricService.getOrgMetrics(campaignId);
            campaignMetrics = campaignMetrics.reduce(
                (acc, curr) => {
                    acc.clickCount += parseInt(curr.clickCount);
                    acc.viewCount += parseInt(curr.viewCount);
                    acc.shareCount += parseInt(curr.shareCount);
                    acc.participationScore += parseInt(curr.participationScore);
                    return acc;
                },
                {
                    clickCount: 0,
                    viewCount: 0,
                    shareCount: 0,
                    participationScore: 0,
                }
            );
            calculateCampaignMetrics.push(campaignMetrics);
            totalParticipants = await this.participantService.findParticipantsCount(campaignId);
        }
        const aggregaredMetrics = {
            clickCount: aggregatedCampaignMetrics?.clickCount || 0,
            viewCount: aggregatedCampaignMetrics?.viewCount || 0,
            shareCount: aggregatedCampaignMetrics?.shareCount || 0,
            participationScore: aggregatedCampaignMetrics?.participationScore || 0,
            totalParticipants: totalParticipants || 0,
            campaignName: aggregatedCampaignMetrics?.campaignName || "",
        };
        const metrics = { aggregaredMetrics, calculateCampaignMetrics };
        return new SuccessResult(metrics, CampaignStatsResultModelArray);
    }

    @Get("/campaigns-lite")
    @(Returns(200, SuccessArrayResult).Of(CampaignResultModel))
    public async getCampaignsLite(@Context() context: Context) {
        this.userService.checkPermissions({ hasRole: ["admin", "manager"] }, context.get("user"));
        const campaigns = await this.campaignService.findCampaigns();
        return new SuccessArrayResult(campaigns, CampaignResultModel);
    }

    @Put("/admin-update-campaign-status")
    @(Returns(200, SuccessResult).Of(BooleanResultModel))
    public async adminUpdateCampaignStatus(
        @QueryParams() query: AdminUpdateCampaignStatusParams,
        @Context() context: Context
    ) {
        this.userService.checkPermissions({ restrictCompany: RAIINMAKER_ORG_NAME }, context.get("user"));
        const { status, campaignId } = query;

        const campaign = await this.campaignService.findCampaignById(campaignId, {
            org: true,
            currency: { include: { token: true } },
        });
        if (!campaign) throw new NotFound(CAMPAIGN_NOT_FOUND);
        if (!campaign.org) throw new NotFound(CAMPAIGN_ORGANIZATION_MISSING);
        switch (status) {
            case "APPROVED":
                if (campaign.type === "raffle") {
                    campaign.status = CampaignStatus.APPROVED;
                    break;
                }
                const walletBalance = await this.organizationService.getAvailableBalance(
                    campaign.org.id,
                    campaign.currency?.tokenId!
                );
                if (walletBalance < parseFloat(campaign.coiinTotal)) {
                    campaign.status = CampaignStatus.INSUFFICIENT_FUNDS;
                    break;
                }
                campaign.status = CampaignStatus.APPROVED;
                const blockageId = await this.campaignService.blockCampaignAmount(campaign.id);
                if (campaign.symbol.toLowerCase() !== "coiin") {
                    campaign.tatumBlockageId = blockageId;
                }
                break;

            case "DENIED":
                campaign.status = CampaignStatus.DENIED;
                break;
        }
        await this.campaignService.adminUpdateCampaignStatus(campaign.id, campaign.status, campaign.tatumBlockageId!);
        const deviceTokens = await User.getAllDeviceTokens("campaignCreate");
        if (deviceTokens.length > 0) await Firebase.sendCampaignCreatedNotifications(deviceTokens, campaign);
        return new SuccessResult({ success: true }, BooleanResultModel);
    }
}
