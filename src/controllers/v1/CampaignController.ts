import { Campaign, CampaignMedia, Prisma } from "@prisma/client";
import { Get, Property, Required, Enum, Returns, Post, ArrayOf, Put } from "@tsed/schema";
import { Controller, Inject } from "@tsed/di";
import { Context, BodyParams, PathParams, QueryParams } from "@tsed/common";
import { CampaignService } from "../../services/CampaignService";
import { UserService } from "../../services/UserService";
import {
    ADMIN,
    CampaignState,
    CampaignStatus,
    CAMPAIGN_REWARD,
    MANAGER,
    RAIINMAKER_ORG_NAME,
} from "../../util/constants";
import { calculateParticipantPayoutV2, calculateParticipantSocialScoreV2 } from "../helpers";
import {
    ACTION_NOT_PERMITTED,
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
    PaidOutCryptoResultModel,
    CreateCampaignParams,
    UpdateCampaignParams,
} from "../../models/RestModels";
import { BadRequest, Forbidden, NotFound } from "@tsed/exceptions";
import { ParticipantService } from "../../services/ParticipantService";
import { SocialPostService } from "../../services/SocialPostService";
import { CampaignAuditStatus, PointValueTypes } from "../../types";
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
import { TatumService } from "../../services/TatumService";
import { MarketDataService } from "../../services/MarketDataService";
import { formatFloat } from "../../util";
import { AdminService } from "../../services/AdminService";
import { SesClient } from "../../clients/ses";

const validator = new Validator();

class ListCampaignsVariablesModel extends PaginatedVariablesModel {
    @Required() @Enum(CampaignState) public readonly state: CampaignState;
    @Property() @Enum(CampaignStatus, "ALL") public readonly status: CampaignStatus | "ALL" | undefined;
    @Property(Boolean) public readonly userRelated: boolean | undefined;
    @Property(String) public readonly auditStatus: CampaignAuditStatus | undefined;
}

class PendingCampaignsParams {
    @Required() @Property(String) public readonly campaignId: string;
    @Required() @Property(String) public readonly status: CampaignStatus;
    @Property(String) public readonly reason: string;
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
    private tatumService: TatumService;
    @Inject()
    private marketDataService: MarketDataService;
    @Inject()
    private adminService: AdminService;

    @Get()
    @(Returns(200, SuccessResult).Of(Pagination).Nested(CampaignResultModel))
    public async list(@QueryParams() query: ListCampaignsVariablesModel, @Context() context: Context) {
        const { orgId } = await this.adminService.checkPermissions({ hasRole: [ADMIN, MANAGER] }, context.get("user"));
        const user = await this.userService.findUserByContext(context.get("user"));
        const [items, total] = await this.campaignService.findCampaignsByStatus(
            query,
            user || undefined,
            query.status !== CampaignStatus.PENDING ? orgId || undefined : undefined
        );
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
        await this.adminService.checkPermissions({ hasRole: [ADMIN, MANAGER] }, context.get("user"));
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
    public async createCampaign(@BodyParams() body: CreateCampaignParams, @Context() context: Context) {
        const { company, orgId } = await this.adminService.checkPermissions(
            { hasRole: [ADMIN, MANAGER] },
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
        validator.validateAlgorithmCreateSchema(JSON.parse(algorithm));
        if (!!requirements) validator.validateCampaignRequirementsSchema(requirements);
        if (type === "raffle") {
            if (!raffle_prize) throw new BadRequest(RAFFLE_PRIZE_MISSING);
            validator.validateRafflePrizeSchema(raffle_prize);
        }
        if (!company) throw new NotFound(COMPANY_NOT_SPECIFIED);
        const org = await this.organizationService.findOrganizationByName(company!);
        if (!org) throw new NotFound(ORG_NOT_FOUND);
        const wallet = await this.walletService.findWalletByOrgId(org.id);
        if (!wallet) throw new NotFound(WALLET_NOT_FOUND);
        let currency;
        if (type === "crypto") {
            currency = await this.tatumService.findOrCreateCurrency({ symbol, network, wallet });
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
            company,
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
        const raiinmakerAdmins = await this.adminService.listAdminsByOrg(orgId!, RAIINMAKER_ORG_NAME);
        const brandName = await this.organizationService.findOrgById(campaign.orgId || "");
        if (campaign.id) {
            if (raiinmakerAdmins) {
                for (const admin of raiinmakerAdmins) {
                    const { email } = await Firebase.getUserById(admin.firebaseId);
                    SesClient.CampaignProcessEmailToAdmin({
                        title: `Campaign review message from ${brandName?.name}`,
                        text: `Hi, please approved "${campaign.name}" campaign`,
                        emailAddress: email || "",
                    });
                }
            }
        }
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
    public async updateCampaign(@BodyParams() body: UpdateCampaignParams, @Context() context: Context) {
        const { orgId } = await this.adminService.checkPermissions({ hasRole: [ADMIN, MANAGER] }, context.get("user"));
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
        validator.validateAlgorithmCreateSchema(JSON.parse(algorithm));
        if (!!requirements) validator.validateCampaignRequirementsSchema(requirements);
        if (type === "raffle") {
            if (!raffle_prize) throw new BadRequest(RAFFLE_PRIZE_MISSING);
            validator.validateRafflePrizeSchema(raffle_prize);
        }
        const campaign: Campaign | null = await this.campaignService.findCampaignById(id);
        if (!campaign) throw new NotFound(CAMPAIGN_NOT_FOUND);
        if (campaign.orgId !== orgId) throw new Forbidden(ACTION_NOT_PERMITTED);
        let campaignImageSignedURL = "";
        const mediaUrls: { name: string | null; channel: string | null; signedUrl: string }[] = [];
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
        if (imagePath && campaign.imagePath !== imagePath) {
            campaignImageSignedURL = await S3Client.generateCampaignSignedURL(`campaign/${campaign.id}/${imagePath}`);
        }
        if (campaignTemplates) {
            const templates = await this.campaignTemplateService.findCampaignTemplateByCampaignId(campaign.id);
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
            for (let index = 0; index < templates.length; index++) {
                const template = templates[index];
                if (!campaignTemplates.find((item) => item.id === template.id)) {
                    await this.campaignTemplateService.deleteCampaignTemplate(template.id);
                }
            }
        }
        if (campaignMedia) {
            const medias = await this.campaignMediaservice.findCampaignMediaByCampaignId(campaign.id);
            for (let i = 0; i < campaignMedia.length; i++) {
                const receivedMedia = campaignMedia[i];
                if (!receivedMedia.id) {
                    const urlObject = { name: receivedMedia.media, channel: receivedMedia.channel, signedUrl: "" };
                    urlObject.signedUrl = await S3Client.generateCampaignSignedURL(
                        `campaign/${campaign.id}/${receivedMedia.media}`
                    );
                    mediaUrls.push(urlObject);
                    await this.campaignMediaservice.updateNewCampaignMedia(receivedMedia, campaign.id);
                }
            }
            const filterMedia = medias.filter((x) => !campaignMedia.map((y) => y.id).includes(x.id));
            if (filterMedia) {
                await this.campaignMediaservice.deleteCampaignMedia(filterMedia.map((x) => x.id));
            }
        }
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
        const { company } = await this.adminService.checkPermissions({ hasRole: [ADMIN] }, context.get("user"));
        const [socialPost] = await this.socialPostService.findSocialPostByCampaignId(campaignId);
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
        if (campaignTemplate.length > 0) this.campaignTemplateService.deleteCampaignTemplates(campaignId);
        const campaignMedia = await this.campaignMediaservice.findCampaignMediaByCampaignId(campaignId);
        if (campaignMedia.length > 0) this.campaignMediaservice.deleteCampaignMedias(campaignId);
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
        const { company } = await this.adminService.checkPermissions({ hasRole: [ADMIN] }, context.get("user"));
        const { campaignId } = query;
        const campaign = await this.campaignService.findCampaignById(campaignId, undefined, company);
        if (!campaign) throw new NotFound(CAMPAIGN_NOT_FOUND);
        await this.campaignService.updateCampaignStatus(campaignId);
        return new SuccessResult({ message: "Campaign has been submitted for auditting" }, UpdatedResultModel);
    }
    @Post("/generate-campaign-audit-report")
    @(Returns(200, SuccessResult).Of(GenerateCampaignAuditReportResultModel))
    public async generateCampaignAuditReport(@QueryParams() query: CampaignIdModel, @Context() context: Context) {
        const { company } = await this.adminService.checkPermissions(
            { hasRole: [ADMIN, MANAGER] },
            context.get("user")
        );
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

    // For admin panel
    @Get("/dashboard-metrics/:campaignId")
    @(Returns(200, SuccessResult).Of(CampaignStatsResultModelArray))
    public async getDashboardMetrics(@PathParams() query: CampaignIdModel, @Context() context: Context) {
        const admin = await this.adminService.findAdminByFirebaseId(context.get("user").id);
        if (!admin) throw new NotFound(ADMIN_NOT_FOUND);
        const { campaignId } = query;
        let aggregatedMetrics;
        let rawMetrics;
        let totalParticipants;
        if (campaignId === "-1") {
            [aggregatedMetrics] = await this.dailyParticipantMetricService.getAggregatedOrgMetrics(admin.orgId!);
            if (!aggregatedMetrics) {
                aggregatedMetrics = { clickCount: 0, viewCount: 0, shareCount: 0, participationScore: 0 };
            }
            aggregatedMetrics = {
                ...aggregatedMetrics,
                participationScore: Math.round(aggregatedMetrics.participationScore),
                name: "All",
            };
            rawMetrics = await this.dailyParticipantMetricService.getOrgMetrics(admin.orgId!);
            const campaigns = await this.campaignService.findCampaigns(admin.orgId!);
            const campaignIds = campaigns.map((campaign) => campaign.id);
            totalParticipants = await this.participantService.findParticipantsCount(undefined, campaignIds);
        }
        if (campaignId && campaignId != "-1") {
            [aggregatedMetrics] = await this.dailyParticipantMetricService.getAggregatedCampaignMetrics(campaignId);
            aggregatedMetrics = {
                ...aggregatedMetrics,
                participationScore: Math.round(aggregatedMetrics.participationScore),
                name: aggregatedMetrics.name,
            };
            rawMetrics = await this.dailyParticipantMetricService.getCampaignMetrics(campaignId);
            totalParticipants = await this.participantService.findParticipantsCount(campaignId);
        }
        aggregatedMetrics = {
            clickCount: aggregatedMetrics?.clickCount || 0,
            viewCount: aggregatedMetrics?.viewCount || 0,
            shareCount: aggregatedMetrics?.shareCount || 0,
            participationScore: aggregatedMetrics?.participationScore || 0,
            totalParticipants: totalParticipants || 0,
            campaignName: aggregatedMetrics?.name || "",
        };
        const metrics = { aggregatedMetrics, rawMetrics };
        return new SuccessResult(metrics, CampaignStatsResultModelArray);
    }

    @Get("/campaigns-lite")
    @(Returns(200, SuccessArrayResult).Of(CampaignResultModel))
    public async getCampaignsLite(@Context() context: Context) {
        const { orgId } = await this.adminService.checkPermissions({ hasRole: [ADMIN, MANAGER] }, context.get("user"));
        const campaigns = await this.campaignService.findCampaigns(orgId);
        return new SuccessArrayResult(campaigns, CampaignResultModel);
    }

    // For admin panel
    @Put("/pending")
    @(Returns(200, SuccessResult).Of(BooleanResultModel))
    public async updatePendingCampaignStatus(@BodyParams() body: PendingCampaignsParams, @Context() context: Context) {
        await this.adminService.checkPermissions({ restrictCompany: RAIINMAKER_ORG_NAME }, context.get("user"));
        const { status, campaignId, reason } = body;
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
        const updatedCampaign = await this.campaignService.adminUpdateCampaignStatus(
            campaign.id,
            campaign.status,
            campaign.tatumBlockageId!
        );
        const brandAdmins = await this.adminService.listAdminsByOrg(campaign?.orgId!);
        if (brandAdmins) {
            for (const admin of brandAdmins) {
                const { email } = await Firebase.getUserById(admin.firebaseId);
                SesClient.CampaignProcessEmailToAdmin({
                    title: "Campaign Approval Status",
                    text: `${campaign.name} has been ${updatedCampaign.status}. ${reason}`,
                    emailAddress: email || "",
                });
            }
        }
        const deviceTokens = await User.getAllDeviceTokens("campaignCreate");
        if (deviceTokens.length > 0) await Firebase.sendCampaignCreatedNotifications(deviceTokens, campaign);
        return new SuccessResult({ message: `campaign has been ${updatedCampaign.status}` }, UpdatedResultModel);
    }

    @Get("/payout/:campaignId")
    @(Returns(200, SuccessResult).Of(PaidOutCryptoResultModel))
    public async getPayout(@PathParams() path: CampaignIdModel, @Context() context: Context) {
        await this.adminService.checkPermissions({ hasRole: [ADMIN] }, context.get("user"));
        const { campaignId } = path;
        const transfers = await this.transferService.findTransferByCampaignIdAndAction(campaignId, CAMPAIGN_REWARD);
        const totalCrypto = transfers.reduce((acc, curr) => (acc += parseFloat(curr.amount)), 0);
        return new SuccessResult({ totalCrypto: formatFloat(totalCrypto) }, PaidOutCryptoResultModel);
    }
}
