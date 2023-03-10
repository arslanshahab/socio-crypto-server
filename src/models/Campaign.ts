import {
    BaseEntity,
    Entity,
    Column,
    OneToMany,
    PrimaryGeneratedColumn,
    CreateDateColumn,
    UpdateDateColumn,
    ManyToOne,
    OneToOne,
    Index,
} from "typeorm";
import { DateUtils } from "typeorm/util/DateUtils";
import { Participant } from "./Participant";
import { AlgorithmSpecs, CampaignAuditStatus, CampaignRequirementSpecs, ListCampaignsVariablesV2 } from "types.d.ts";
import { SocialPost } from "./SocialPost";
import { Transfer } from "./Transfer";
import { StringifiedArrayTransformer, BigNumberEntityTransformer, AlgorithmTransformer } from "../util/transformers";
import { BigNumber } from "bignumber.js";
import { DailyParticipantMetric } from "./DailyParticipantMetric";
import { getDatesBetweenDates, formatUTCDateForComparision } from "../controllers/helpers";
import { User } from "./User";
import { Org } from "./Org";
import { HourlyCampaignMetric } from "./HourlyCampaignMetric";
import { RafflePrize } from "./RafflePrize";
import { Escrow } from "./Escrow";
import { CryptoCurrency } from "./CryptoCurrency";
import { CampaignMedia } from "./CampaignMedia";
import { CampaignTemplate } from "./CampaignTemplate";
import { TatumClient } from "../clients/tatumClient";
import { Currency } from "./Currency";
import { getCryptoAssestImageUrl, BN } from "../util";
import { CampaignStatus, RAIINMAKER_ORG_NAME, CAMPAIGN_CREATION_AMOUNT } from "../util/constants";
import { getTokenValueInUSD } from "../util/exchangeRate";
import { subDays } from "date-fns";
import { Transaction } from "./Transaction";

@Entity()
export class Campaign extends BaseEntity {
    @PrimaryGeneratedColumn("uuid")
    public id: string;

    @Column({ nullable: false })
    public name: string;

    @Index()
    @Column({ type: "timestamptz", nullable: false })
    public beginDate: Date;

    @Index()
    @Column({ type: "timestamptz", nullable: false })
    public endDate: Date;

    @Index()
    @Column({ nullable: false, default: "DEFAULT" })
    public status: CampaignStatus;

    @Column({ nullable: false })
    public symbol: string;

    @Column({ nullable: true })
    public tatumBlockageId: string;

    @Column({ type: "varchar", transformer: BigNumberEntityTransformer })
    public coiinTotal: BigNumber;

    public coiinTotalUSD: number;

    @Column({
        type: "varchar",
        nullable: false,
        default: 0,
        transformer: BigNumberEntityTransformer,
    })
    public totalParticipationScore: BigNumber;

    @Column()
    public target: string;

    @Column({ default: "", nullable: true })
    public description: string;

    @Column({ default: "", nullable: true })
    public instructions: string;

    @Column({ nullable: false, default: RAIINMAKER_ORG_NAME })
    public company: string;

    @Column({ nullable: true })
    public tagline: string;

    @Column({
        type: "jsonb",
        nullable: false,
        transformer: AlgorithmTransformer,
    })
    public algorithm: AlgorithmSpecs;

    @Column({ nullable: false, default: false })
    public audited: boolean;

    @Column({ nullable: false, default: "DEFAULT" })
    public auditStatus: CampaignAuditStatus;

    @Column({ nullable: true })
    public targetVideo: string;

    @Column({ nullable: true })
    public campaignType: string;

    @Column({
        type: "text",
        nullable: false,
        default: "[]",
        transformer: StringifiedArrayTransformer,
    })
    public socialMediaType: string[];

    @Column({ nullable: true })
    public imagePath: string;

    @Column({ type: "jsonb", nullable: true })
    public requirements: CampaignRequirementSpecs;

    @Index()
    @Column({ nullable: false, default: false })
    public isGlobal: boolean;

    @Column({ nullable: false, default: true })
    public showUrl: boolean;

    @Column({
        type: "text",
        nullable: false,
        default: "[]",
        transformer: StringifiedArrayTransformer,
    })
    public suggestedPosts: string[];

    @Column({
        type: "text",
        nullable: false,
        default: "[]",
        transformer: StringifiedArrayTransformer,
    })
    public suggestedTags: string[];

    @Column({
        type: "text",
        nullable: false,
        default: "[]",
        transformer: StringifiedArrayTransformer,
    })
    public keywords: string[];

    @Column({ type: "text", nullable: true })
    public type: string;

    public symbolImageUrl = "";
    public network = "";

    @OneToMany((_type) => Participant, (participant) => participant.campaign)
    public participants: Participant[];

    @OneToMany((_type) => Transaction, (transaction) => transaction.campaign)
    public transactions: Transaction[];

    @OneToMany((_type) => CampaignMedia, (campaignMedia) => campaignMedia.campaign)
    public campaignMedia: CampaignMedia[];

    @OneToMany((_type) => CampaignTemplate, (campaignTemplate) => campaignTemplate.campaign)
    public campaignTemplates: CampaignTemplate[];

    @OneToMany((_type) => SocialPost, (post) => post.campaign)
    public posts: SocialPost[];

    @OneToMany((_type) => Transfer, (transfer) => transfer.campaign)
    public payouts: Transfer[];

    @OneToMany((_type) => DailyParticipantMetric, (metric) => metric.campaign)
    public dailyMetrics: DailyParticipantMetric[];

    @OneToMany((_type) => HourlyCampaignMetric, (metric) => metric.campaign)
    public hourlyMetrics: HourlyCampaignMetric[];

    @ManyToOne((_type) => Org, (org) => org.campaigns)
    public org: Org;

    @ManyToOne((_type) => Currency, (currency) => currency.campaign)
    public currency: Currency;

    @OneToOne((_type) => RafflePrize, (prize) => prize.campaign)
    public prize: RafflePrize;

    @OneToOne((_type) => Escrow, (escrow) => escrow.campaign)
    public escrow: Escrow;

    @ManyToOne((_type) => CryptoCurrency, (crypto) => crypto.campaigns, {
        eager: true,
        nullable: true,
    })
    public crypto: CryptoCurrency;

    @CreateDateColumn()
    public createdAt: Date;

    @UpdateDateColumn()
    public updatedAt: Date;

    isOpen() {
        const now = new Date();
        if (new Date(this.beginDate).getTime() <= now.getTime() && new Date(this.endDate).getTime() >= now.getTime())
            return true;
        return false;
    }

    public static parseAlgorithm(algorithmEntity: AlgorithmSpecs) {
        const algorithm: { [key: string]: any } = algorithmEntity;
        for (const key in algorithm["pointValues"]) {
            algorithm["pointValues"][key] = algorithm["pointValues"][key].toString();
        }
        for (const tier in algorithm["tiers"]) {
            const threshold = algorithm["tiers"][tier]["threshold"];
            const totalCoiins = algorithm["tiers"][tier]["totalCoiins"];
            if (threshold !== "" && totalCoiins !== "") {
                algorithm["tiers"][tier]["threshold"] = algorithm["tiers"][tier]["threshold"].toString();
                algorithm["tiers"][tier]["totalCoiins"] = algorithm["tiers"][tier]["totalCoiins"].toString();
            }
        }
        return algorithm;
    }

    public asV1() {
        const returnedCampaign: Campaign = {
            ...this,
            totalParticipationScore: parseFloat(
                this.totalParticipationScore ? this.totalParticipationScore.toString() : "0"
            ),
            coiinTotal: parseFloat(this?.coiinTotal?.toString() || "0"),
            algorithm: Campaign.parseAlgorithm(this.algorithm),
        };
        if (this.participants && this.participants.length > 0)
            returnedCampaign.participants = this.participants.map((participant) => participant.asV1());
        if (this.payouts && this.payouts.length > 0)
            returnedCampaign.payouts = this.payouts.map((payout) => payout.asV1());
        if (this.posts && this.posts.length > 0) returnedCampaign.posts = this.posts.map((post) => post.asV1());
        if (this.org) returnedCampaign.org = this.org.asV1();
        if (this.crypto) returnedCampaign.crypto = this.crypto.asV1();
        return returnedCampaign;
    }

    public async asV2() {
        const campaign = { ...this.asV1() };
        campaign.coiinTotalUSD = await getTokenValueInUSD(
            campaign.symbol,
            parseFloat(campaign?.coiinTotal?.toString() || "0")
        );
        if (this.currency) {
            const currency = await Currency.findOne({ where: { id: this.currency.id }, relations: ["token"] });
            campaign.network = currency?.token?.network || "";
            campaign.symbol = currency?.token?.symbol || "";
            campaign.symbolImageUrl = getCryptoAssestImageUrl(currency?.token?.symbol || "");
        }
        return campaign;
    }

    public static async getAllParticipatingCampaignIdsByUser(user: User): Promise<string[]> {
        const u = await User.findOne({
            where: { id: user.id },
            relations: ["campaigns", "campaigns.campaign"],
        });
        if (!u) throw new Error("User not found.");
        return u.campaigns.length > 0 ? u.campaigns.map((participant: Participant) => participant.campaign.id) : [];
    }

    public static async findCampaignsByStatus(
        open: boolean,
        skip: number,
        take: number,
        company: string,
        sort: boolean,
        approved: boolean,
        pendingAudit: boolean
    ) {
        let where = "";
        const now = DateUtils.mixedDateToDatetimeString(new Date());
        if (open !== null && open !== undefined && open) {
            where = `("beginDate" <= '${now}' AND "endDate" >= '${now}')`;
        } else if (open !== null && open !== undefined && !open) {
            where = `("beginDate" >= '${now}' OR "endDate" <= '${now}')`;
        }
        let query = this.createQueryBuilder("campaign").where(where);
        if (company) query = query.andWhere(`"company"=:company`, { company });
        if (approved) query = query.andWhere('"status"=:status', { status: "APPROVED" });
        if (pendingAudit === true) {
            query = query.andWhere('"auditStatus"=:auditStatus', { auditStatus: "DEFAULT" });
        }
        if (sort) query = query.orderBy("campaign.endDate", "DESC");
        query = query.andWhere('"isGlobal"=:isGlobal', { isGlobal: false });
        return await query
            .leftJoinAndSelect("campaign.participants", "participant", 'participant."campaignId" = campaign.id')
            .leftJoinAndSelect("participant.user", "user", 'user.id = participant."userId"')
            .leftJoinAndSelect("user.profile", "profile", 'user.id = profile."userId"')
            .leftJoinAndSelect("campaign.crypto", "crypto", 'campaign."cryptoId" = crypto.id')
            .leftJoinAndSelect("campaign.campaignMedia", "campaign_media", 'campaign_media."campaignId" = campaign.id')
            .leftJoinAndSelect(
                "campaign.campaignTemplates",
                "campaign_template",
                'campaign_template."campaignId" = campaign.id'
            )
            .skip(skip)
            .take(take)
            .getManyAndCount();
    }

    public static async findCampaignsByStatusV2(params: ListCampaignsVariablesV2, user?: User) {
        const now = DateUtils.mixedDateToUtcDatetimeString(new Date());
        let where = "";
        if (params.state === "OPEN") where = `("endDate" >= '${now}')`;
        if (params.state === "CLOSED") where = `("endDate" <= '${now}')`;
        let query = this.createQueryBuilder("campaign").where(where);
        if (params.status) {
            query = query.andWhere("campaign.status = :status", { status: params.status });
        } else {
            query = query.andWhere("campaign.status = :status", { status: "APPROVED" });
        }
        if (params.userRelated !== null && params.userRelated) {
            query = query
                .leftJoin("campaign.participants", "participant", 'participant."campaignId" = campaign.id')
                .andWhere('participant."userId" = :id', { id: user?.id });
        }
        return query
            .andWhere(`campaign."isGlobal" = :global`, { status: "APPROVED", global: false })
            .leftJoinAndSelect("campaign.campaignMedia", "campaign_media", 'campaign_media."campaignId" = campaign.id')
            .leftJoinAndSelect(
                "campaign.campaignTemplates",
                "campaign_template",
                'campaign_template."campaignId" = campaign.id'
            )
            .leftJoinAndSelect("campaign.currency", "currency", 'campaign."currencyId" = currency.id')
            .orderBy("campaign.endDate", "DESC")
            .skip(params.skip)
            .take(params.take)
            .getManyAndCount();
    }

    public static async listCampaignsByStatus(open: boolean = true, audited: boolean = false) {
        let where = "";
        let query = this.createQueryBuilder("campaign");
        const now = DateUtils.mixedDateToDatetimeString(new Date());
        if (open !== null && open) {
            where = `("beginDate" <= '${now}' AND "endDate" >= '${now}')`;
        } else if (open !== null && !open) {
            where = `("beginDate" >= '${now}' OR "endDate" <= '${now}')`;
        }
        return query
            .where(where)
            .andWhere('"audited"=:audited', { audited })
            .andWhere('"isGlobal"=:isGlobal', { isGlobal: false })
            .leftJoinAndSelect("campaign.participants", "participant", 'participant."campaignId" = campaign.id')
            .leftJoinAndSelect("participant.user", "user", 'user.id = participant."userId"')
            .getMany();
    }

    public static async adminListCampaignsByStatus(skip: number, take: number, status: string = "PENDING") {
        return this.createQueryBuilder("campaign")
            .leftJoinAndSelect("campaign.org", "org", 'campaign."orgId" = org.id')
            .leftJoinAndSelect("campaign.crypto", "crypto", 'campaign."cryptoId" = crypto.id')
            .where("status=:status", { status: status.toUpperCase() })
            .andWhere('"isGlobal"=:isGlobal', { isGlobal: false })
            .skip(skip)
            .take(take)
            .getManyAndCount();
    }

    public static async findCampaignById(id: string, company: string) {
        let query = this.createQueryBuilder("campaign");
        return query
            .leftJoinAndSelect("campaign.participants", "participant", 'participant."campaignId" = campaign.id')
            .leftJoinAndSelect("participant.user", "user", 'user.id = participant."userId"')
            .leftJoinAndSelect("user.wallet", "wallet", 'wallet."userId" = user.id')
            .leftJoinAndSelect("user.profile", "profile", 'profile."userId" = user.id')
            .where("campaign.company = :company AND campaign.id = :id", {
                company,
                id,
            })
            .getOne();
    }

    public static async getCampaignMetrics(id: string) {
        const { clickCount, submissionCount, viewCount, participants } = await this.createQueryBuilder("campaign")
            .leftJoinAndSelect("campaign.participants", "participant", 'participant."campaignId" = campaign.id')
            .where("campaign.id = :id", { id })
            .select(
                'SUM(CAST(participant."clickCount" AS int)) as "clickCount", SUM(CAST(participant."submissionCount" AS int)) as "submissionCount", SUM(CAST(participant."viewCount" AS int)) as "viewCount", COUNT(participant.id) as participants'
            )
            .getRawOne();
        const { likes, shares, comments, posts } = await this.createQueryBuilder("campaign")
            .leftJoinAndSelect("campaign.posts", "post", 'post."campaignId" = campaign.id')
            .where("campaign.id = :id", { id })
            .select(
                'SUM(CAST(post.likes AS int)) as "likes", SUM(CAST(post.shares AS int)) as "shares", SUM(CAST(post.comments AS int)) as "comments", COUNT(post.id) as posts'
            )
            .getRawOne();

        return {
            clickCount: clickCount || 0,
            viewCount: viewCount || 0,
            submissionCount: submissionCount || 0,
            participantCount: participants || 0,
            likeCount: likes || 0,
            commentCount: comments || 0,
            shareCount: shares || 0,
            postCount: posts || 0,
        };
    }

    public static async getPlatformMetrics() {
        const { clickCount, submissionCount, viewCount, participants } = await this.createQueryBuilder("campaign")
            .leftJoinAndSelect("campaign.participants", "participant", 'participant."campaignId" = campaign.id')
            .select(
                'SUM(CAST(participant."clickCount" AS int)) as "clickCount", SUM(CAST(participant."submissionCount" AS int)) as "submissionCount", SUM(CAST(participant."viewCount" AS int)) as "viewCount", COUNT(participant.id) as participants'
            )
            .getRawOne();
        const { likes, shares, comments, posts } = await this.createQueryBuilder("campaign")
            .leftJoinAndSelect("campaign.posts", "post", 'post."campaignId" = campaign.id')
            .select(
                'SUM(CAST(post.likes AS int)) as "likes", SUM(CAST(post.shares AS int)) as "shares", SUM(CAST(post.comments AS int)) as "comments", COUNT(post.id) as posts'
            )
            .getRawOne();

        return {
            clickCount: Number(clickCount) || 0,
            viewCount: Number(viewCount) || 0,
            submissionCount: Number(submissionCount) || 0,
            participantCount: Number(participants) || 0,
            likeCount: Number(likes) || 0,
            commentCount: Number(comments) || 0,
            shareCount: Number(shares) || 0,
            postCount: Number(posts) || 0,
            discoveryCount: Number(likes) + Number(shares) + Number(comments) || 0,
            conversionCount: Number(clickCount) + Number(submissionCount) + Number(viewCount) || 0,
        };
    }

    public static async updateAllDailyParticipationMetrics(campaignId: string) {
        const campaign = await Campaign.findOne({
            where: { id: campaignId },
            relations: ["participants", "participants.user"],
        });
        if (!campaign) throw new Error("campaign not found");
        const alreadyHandledParticipants: { [key: string]: any } = {};
        for (let i = 0; i < campaign.participants.length; i++) {
            const participant = campaign.participants[i];
            const currentDate = new Date();
            if (!alreadyHandledParticipants[participant.id]) {
                const metrics = await DailyParticipantMetric.getSortedByParticipantId(participant.id);
                if (metrics.length > 0) {
                    if (
                        formatUTCDateForComparision(metrics[metrics.length - 1].createdAt) !==
                        formatUTCDateForComparision(currentDate)
                    ) {
                        const datesInBetween = getDatesBetweenDates(metrics[metrics.length - 1].createdAt, currentDate);
                        for (let j = 0; j < datesInBetween.length; j++) {
                            await DailyParticipantMetric.insertPlaceholderRow(
                                datesInBetween[j],
                                metrics[metrics.length - 1].totalParticipationScore,
                                participant.campaign,
                                participant.user,
                                participant
                            );
                        }
                    }
                } else {
                    const yesterday = subDays(currentDate, 1);
                    const datesInBetween = getDatesBetweenDates(yesterday, currentDate);
                    for (let j = 0; j < datesInBetween.length; j++) {
                        await DailyParticipantMetric.insertPlaceholderRow(
                            datesInBetween[j],
                            new BN(0),
                            participant.campaign,
                            participant.user,
                            participant
                        );
                    }
                }
                alreadyHandledParticipants[participant.id] = 1;
            }
        }
        return true;
    }

    public static newCampaign(
        name: string,
        beginDate: string,
        endDate: string,
        coiinTotal: number,
        target: string,
        description: string,
        instructions: string,
        company: string,
        symbol: string,
        algorithm: string,
        tagline: string,
        requirements: CampaignRequirementSpecs,
        suggestedPosts: string[],
        suggestedTags: string[],
        keywords: string[],
        type: string,
        imagePath: string,
        campaignType: string,
        socialMediaType: string[],
        isGlobal: boolean,
        showUrl: boolean,
        targetVideo?: string,
        org?: Org,
        currency?: Currency
    ): Campaign {
        const campaign = new Campaign();
        if (org) campaign.org = org;
        if (currency) campaign.currency = currency;
        campaign.name = name;
        campaign.coiinTotal = new BN(coiinTotal);
        campaign.target = target;
        campaign.company = company;
        campaign.status = isGlobal ? CampaignStatus.APPROVED : CampaignStatus.PENDING;
        campaign.symbol = symbol.toUpperCase();
        campaign.beginDate = new Date(beginDate);
        campaign.endDate = new Date(endDate);
        campaign.algorithm = JSON.parse(algorithm);
        campaign.totalParticipationScore = new BN(0);
        campaign.type = type;
        campaign.imagePath = imagePath;
        campaign.campaignType = campaignType;
        campaign.socialMediaType = socialMediaType;
        campaign.isGlobal = isGlobal;
        campaign.showUrl = showUrl;
        if (targetVideo) campaign.targetVideo = targetVideo;
        if (description) campaign.description = description;
        if (instructions) campaign.instructions = instructions;
        if (tagline) campaign.tagline = tagline;
        if (requirements) campaign.requirements = requirements;
        if (suggestedPosts) campaign.suggestedPosts = suggestedPosts;
        if (suggestedTags) campaign.suggestedTags = suggestedTags;
        if (keywords) campaign.keywords = keywords;
        return campaign;
    }

    public async blockCampaignAmount(): Promise<string> {
        try {
            const campaign = await Campaign.findOne({
                where: { id: this.id },
                relations: ["currency"],
            });
            if (!campaign) throw new Error("campaign now found");
            const currency = await Currency.findOne({ where: { id: campaign.currency.id } });
            if (!currency) throw new Error("currency not found for campaign");
            const blockageKey = `${CAMPAIGN_CREATION_AMOUNT}:${campaign.id}`;
            const blockedAmount = await TatumClient.blockAccountBalance(
                currency.tatumId,
                campaign.coiinTotal.toString(),
                blockageKey
            );
            return blockedAmount.id;
        } catch (error) {
            console.log(error);
            throw new Error(error.message);
        }
    }
}
