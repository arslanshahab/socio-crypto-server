import {
    Campaign,
    CampaignMedia,
    CampaignTemplate,
    CryptoCurrency,
    Currency,
    Participant,
    Prisma,
    Token,
} from "@prisma/client";
import { Get, Property, Required, Enum, Returns, Post } from "@tsed/schema";
import { Controller, Inject } from "@tsed/di";
import { BodyParams, Context, QueryParams } from "@tsed/common";
import { CampaignService } from "../../services/CampaignService";
import { UserService } from "../../services/UserService";
import { CampaignState, CampaignStatus } from "../../util/constants";
import { calculateTier } from "../helpers";
import { BN } from "../../util";
import { getTokenPriceInUsd } from "../../clients/ethereum";
import {
    CAMPAIGN_NAME_EXISTS,
    CAMPAIGN_NOT_FOUND,
    COMPANY_NOT_SPECIFIED,
    ERROR_CALCULATING_TIER,
    ORG_NOT_FOUND,
    RAFFLE_PRIZE_MISSING,
    USER_NOT_FOUND,
    WALLET_NOT_FOUND,
} from "../../util/errors";
import { PaginatedVariablesModel, Pagination, SuccessResult } from "../../util/entities";
import {
    CampaignMetricsResultModel,
    CampaignResultModel,
    CreateCampaignResultModel,
    CurrentCampaignModel,
    MediaUrlsModel,
} from "../../models/RestModels";
import { BadRequest, NotFound } from "@tsed/exceptions";
import { ParticipantService } from "../../services/ParticipantService";
import { SocialPostService } from "../../services/SocialPostService";
import { CryptoCurrencyService } from "../../services/CryptoCurrencyService";
import { getSymbolValueInUSD } from "../../util/exchangeRate";
import { getCryptoAssestImageUrl } from "../../util";
import { CampaignCreateTypes, Tiers } from "../../types";
import { addYears } from "date-fns";
import { Validator } from "../../schemas";
import { OrganizationService } from "../../services/OrganizationService";
import { WalletService } from "../../services/WalletService";
import { TatumClient } from "../../clients/tatumClient";
import { S3Client } from "../../clients/s3";
import { User } from "../../models/User";
import { Firebase } from "../../clients/firebase";
import { RafflePrizeService } from "../../services/RafflePrizeService";

const validator = new Validator();

class ListCampaignsVariablesModel extends PaginatedVariablesModel {
    @Required() @Enum(CampaignState) public readonly state: CampaignState;
    @Property() @Enum(CampaignStatus, "ALL") public readonly status: CampaignStatus | "ALL" | undefined;
    @Property(Boolean) public readonly userRelated: boolean | undefined;
}
class ListCurrentCampaignVariablesModel {
    @Property() public readonly campaignId: string;
    @Property() public readonly userRelated: boolean | undefined;
}

async function getCampaignResultModel(
    campaign: Campaign & {
        participant: Participant[];
        currency: (Currency & { token: Token | null }) | null;
        crypto_currency: CryptoCurrency | null;
        campaign_media: CampaignMedia[];
        campaign_template: CampaignTemplate[];
    }
) {
    const result: CampaignResultModel = campaign;
    if (result.coiinTotal) {
        const value = await getSymbolValueInUSD(campaign.symbol, parseFloat(campaign.coiinTotal.toString()));
        result.coiinTotalUSD = value.toFixed(2);
    } else {
        result.coiinTotalUSD = "0";
    }

    if (campaign.currency) {
        result.network = campaign.currency.token?.network || "";
        result.symbol = campaign.currency.token?.symbol || "";
        result.symbolImageUrl = getCryptoAssestImageUrl(campaign.currency?.token?.symbol || "");
    }

    return result;
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
    private cryptoCurrencyService: CryptoCurrencyService;
    @Inject()
    private organizationService: OrganizationService;
    @Inject()
    private walletService: WalletService;
    @Inject()
    private rafflePrizeService: RafflePrizeService;
    @Inject()
    private userService: UserService;

    @Get()
    @(Returns(200, SuccessResult).Of(Pagination).Nested(CampaignResultModel))
    public async list(@QueryParams() query: ListCampaignsVariablesModel, @Context() context: Context) {
        const user = await this.userService.findUserByContext(context.get("user"));
        const [items, total] = await this.campaignService.findCampaignsByStatus(query, user || undefined);
        const modelItems = await Promise.all(items.map((i) => getCampaignResultModel(i)));
        return new SuccessResult(new Pagination(modelItems, total, CampaignResultModel), Pagination);
    }
    @Get("/current-campaign-tier")
    @(Returns(200, SuccessResult).Of(CurrentCampaignModel))
    public async currentCampaignTier(
        @QueryParams() query: ListCurrentCampaignVariablesModel,
        @Context() context: Context
    ) {
        let { campaignId } = query;
        let currentTierSummary;
        let currentCampaign: Campaign | null;
        let cryptoPriceUsd;
        const user = await this.userService.findUserByContext(context.get("user"));
        if (!user) throw new BadRequest(USER_NOT_FOUND);
        currentCampaign = await this.campaignService.findCampaignById(campaignId);
        if (campaignId) {
            if (!currentCampaign) throw new NotFound(CAMPAIGN_NOT_FOUND);
            if (currentCampaign.type == "raffle") return { currentTier: -1, currentTotal: 0 };
            currentTierSummary = calculateTier(
                new BN(currentCampaign.totalParticipationScore),
                (currentCampaign.algorithm as Prisma.JsonObject).tiers as Prisma.JsonObject as unknown as Tiers
            );
            if (currentCampaign.cryptoId) {
                const cryptoCurrency = await this.cryptoCurrencyService.findCryptoCurrencyById(
                    currentCampaign.cryptoId
                );
                const cryptoCurrencyType = cryptoCurrency?.type;
                if (!cryptoCurrencyType) throw new NotFound("Crypto currency not found");
                cryptoPriceUsd = await getTokenPriceInUsd(cryptoCurrencyType);
            }
        }
        if (!currentTierSummary) throw new BadRequest(ERROR_CALCULATING_TIER);
        let body: CurrentCampaignModel = {
            currentTier: currentTierSummary.currentTier,
            currentTotal: parseFloat(currentTierSummary.currentTotal.toString()),
            campaignType: null,
            tokenValueCoiin: null,
            tokenValueUsd: null,
        };
        if (currentCampaign) body.campaignType = currentCampaign.type;
        if (cryptoPriceUsd) body.tokenValueUsd = cryptoPriceUsd.toString();
        if (cryptoPriceUsd) body.tokenValueCoiin = cryptoPriceUsd.times(10).toString();
        return new SuccessResult(body, CurrentCampaignModel);
    }
    @Get("/campaign-metrics")
    @(Returns(200, SuccessResult).Of(CampaignMetricsResultModel))
    public async getCampaignMetrics(
        @QueryParams() query: ListCurrentCampaignVariablesModel,
        @Context() context: Context
    ) {
        // this.userService.checkPermissions({ hasRole: ["admin"] }, context.get("user"));
        const { campaignId } = query;
        const { _sum, _count } = await this.participantService.findPaticipantMetricsById(campaignId);
        const { postSum, postCount } = await this.socialPostService.findSocialPostMetricsById(campaignId);
        const metrics = {
            clickCount: _sum.clickCount,
            viewCount: _sum.viewCount,
            submissionCount: _sum.submissionCount,
            participantCount: _count,
            likeCount: postSum.likes,
            commentCount: postSum.comments,
            shareCount: postSum.shares,
            postCount,
        };
        return new SuccessResult(metrics, CampaignMetricsResultModel);
    }

    @Post("/create-campaign")
    @(Returns(200, SuccessResult).Of(CreateCampaignResultModel))
    public async createCampaign(@BodyParams() body: CampaignCreateTypes, @Context() context: Context) {
        const { role, company = "raiinmaker" } = this.userService.checkPermissions(
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
        const org = await this.organizationService.findOrganizationByCompanyName(company);
        if (!org) throw new NotFound(ORG_NOT_FOUND);
        const wallet: any = await this.walletService.findWalletByOrgId(org.id);
        if (!wallet) throw new NotFound(WALLET_NOT_FOUND);
        let currency;
        if (type === "crypto") {
            currency = await TatumClient.findOrCreateCurrency({ symbol, network, wallet });
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
        campaignMedia;
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
        // const deviceTokens = await this.userService.getAllDeviceTokens("campaignCreate");
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
    @(Returns(200, SuccessResult).Of(CreateCampaignResultModel))
    public async updateCampaign(@BodyParams() body: CampaignCreateTypes, @Context() context: Context) {
        const { role, company = "raiinmaker" } = this.userService.checkPermissions(
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
        const org = await this.organizationService.findOrganizationByCompanyName(company);
        if (!org) throw new NotFound(ORG_NOT_FOUND);
        const campaign: Campaign | null = await this.campaignService.findCampaignById(id);
        if (!campaign) throw new NotFound(CAMPAIGN_NOT_FOUND);
        let campaignImageSignedURL = "";
        const raffleImageSignedURL = "";
        const mediaUrls: { name: string | null; channel: string | null; signedUrl: string }[] = [];
        if (imagePath && campaign.imagePath !== imagePath) {
            imagePath;
            campaignImageSignedURL = await S3Client.generateCampaignSignedURL(`campaign/${campaign.id}/${imagePath}`);
        }
        if (campaignTemplates) {
            for (let i = 0; i < campaignTemplates.length; i++) {
                const receivedTemplate = campaignTemplates[i];
                const foundTemplate = await this.campaignService.findCampaignTemplateById(receivedTemplate.id);
                if (foundTemplate) {
                    await this.campaignService.updateCampaignTemplate(receivedTemplate);
                } else {
                    await this.campaignService.updateNewCampaignTemplate(receivedTemplate, campaign.id);
                }
            }
        }
        if (campaignMedia) {
            for (let i = 0; i < campaignMedia.length; i++) {
                const receivedMedia = campaignMedia[i];
                const foundMedia = await this.campaignService.findCampaignMediaById(receivedMedia.id);
                if (foundMedia && foundMedia.media !== receivedMedia.media) {
                    await this.campaignService.updateCampaignMedia(receivedMedia);
                    const urlObject = { name: receivedMedia.media, channel: receivedMedia.channel, signedUrl: "" };
                    urlObject.signedUrl = await S3Client.generateCampaignSignedURL(
                        `campaign/${campaign.id}/${receivedMedia.media}`
                    );
                    mediaUrls.push(urlObject);
                } else {
                    const urlObject = { name: receivedMedia.media, channel: receivedMedia.channel, signedUrl: "" };
                    urlObject.signedUrl = await S3Client.generateCampaignSignedURL(
                        `campaign/${campaign.id}/${receivedMedia.media}`
                    );
                    mediaUrls.push(urlObject);
                    await this.campaignService.updateNewCampaignMedia(receivedMedia, campaign.id);
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
            raffleImageSignedURL,
            mediaUrls,
        };
        console.log("result after response----------------------/", result);
    }
}
