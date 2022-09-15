import {
    BaseEntity,
    Entity,
    PrimaryGeneratedColumn,
    Column,
    CreateDateColumn,
    UpdateDateColumn,
    ManyToOne,
    MoreThan,
} from "typeorm";
import { BigNumber } from "bignumber.js";
import { BigNumberEntityTransformer } from "../util/transformers";
import { User } from "./User";
import { Campaign } from "./Campaign";
import { BN } from "../util";
import { Participant } from "./Participant";
import { DateUtils } from "typeorm/util/DateUtils";
import { AggregateDailyMetrics } from "types";

@Entity()
export class DailyParticipantMetric extends BaseEntity {
    @PrimaryGeneratedColumn("uuid")
    public id: string;

    @Column({
        type: "varchar",
        nullable: false,
        default: 0,
        transformer: BigNumberEntityTransformer,
    })
    public clickCount: BigNumber;

    @Column({
        type: "varchar",
        nullable: false,
        default: 0,
        transformer: BigNumberEntityTransformer,
    })
    public viewCount: BigNumber;

    @Column({
        type: "varchar",
        nullable: false,
        default: 0,
        transformer: BigNumberEntityTransformer,
    })
    public submissionCount: BigNumber;

    @Column({
        type: "varchar",
        nullable: false,
        default: 0,
        transformer: BigNumberEntityTransformer,
    })
    public likeCount: BigNumber;

    @Column({
        type: "varchar",
        nullable: false,
        default: 0,
        transformer: BigNumberEntityTransformer,
    })
    public shareCount: BigNumber;

    @Column({
        type: "varchar",
        nullable: false,
        default: 0,
        transformer: BigNumberEntityTransformer,
    })
    public commentCount: BigNumber;

    @Column({
        type: "varchar",
        nullable: false,
        default: 0,
        transformer: BigNumberEntityTransformer,
    })
    public participationScore: BigNumber;

    @Column({
        type: "varchar",
        nullable: false,
        default: 0,
        transformer: BigNumberEntityTransformer,
    })
    public totalParticipationScore: BigNumber;

    @Column({ nullable: false })
    public participantId: string;

    @CreateDateColumn()
    public createdAt: Date;

    @UpdateDateColumn()
    public updatedAt: Date;

    @ManyToOne((_type) => User, (user) => user.dailyMetrics)
    public user: User;

    @ManyToOne((_type) => Campaign, (campaign) => campaign.dailyMetrics)
    public campaign: Campaign;

    public asV1() {
        const response: { [key: string]: any } = {
            ...this,
            clickCount: this.clickCount.toNumber(),
            viewCount: this.viewCount.toNumber(),
            submissionCount: this.submissionCount.toNumber(),
            likeCount: this.likeCount.toNumber(),
            shareCount: this.shareCount.toNumber(),
            commentCount: this.commentCount.toNumber(),
            participationScore: parseFloat(this.participationScore.toString()),
            totalParticipationScore: parseFloat(this.totalParticipationScore.toString()),
        };
        if (this.campaign) response.campaignId = this.campaign.id;
        return response;
    }

    public static async upsertData(
        user: User,
        campaign: Campaign,
        participant: Participant,
        action: "clicks" | "views" | "submissions" | "likes" | "shares" | "comments",
        additiveParticipationScore: BigNumber,
        actionCount: number = 1,
        shouldSave: boolean = true
    ): Promise<DailyParticipantMetric> {
        if (!["clicks", "views", "submissions", "likes", "shares", "comments"].includes(action))
            throw new Error("action not supported");
        const currentDate = new Date();
        const month =
            currentDate.getUTCMonth() + 1 < 10 ? `0${currentDate.getUTCMonth() + 1}` : currentDate.getUTCMonth() + 1;
        const day = currentDate.getUTCDate() < 10 ? `0${currentDate.getUTCDate()}` : currentDate.getUTCDate();
        const yyymmdd = `${currentDate.getUTCFullYear()}-${month}-${day}`;
        let record = await DailyParticipantMetric.findOne({
            where: {
                participantId: participant.id,
                createdAt: MoreThan(`${yyymmdd} 00:00:00`),
            },
        });
        if (!record) {
            record = new DailyParticipantMetric();
            record.participantId = participant.id;
            record.user = user;
            record.campaign = campaign;
        }
        record.totalParticipationScore = participant.participationScore;
        switch (action) {
            case "clicks":
                record.clickCount = record.clickCount
                    ? record.clickCount.plus(new BN(actionCount))
                    : new BN(actionCount);
                break;
            case "views":
                record.viewCount = record.viewCount ? record.viewCount.plus(new BN(actionCount)) : new BN(actionCount);
                break;
            case "submissions":
                record.submissionCount = record.submissionCount
                    ? record.submissionCount.plus(new BN(actionCount))
                    : new BN(actionCount);
                break;
            case "likes":
                record.likeCount = record.likeCount ? record.likeCount.plus(new BN(actionCount)) : new BN(actionCount);
                break;
            case "shares":
                record.shareCount = record.shareCount
                    ? record.shareCount.plus(new BN(actionCount))
                    : new BN(actionCount);
                break;
            case "comments":
                record.commentCount = record.commentCount
                    ? record.commentCount.plus(new BN(actionCount))
                    : new BN(actionCount);
                break;
        }
        record.participationScore = record.participationScore
            ? record.participationScore.plus(additiveParticipationScore)
            : new BN(additiveParticipationScore);
        if (shouldSave) await record.save();
        return record;
    }

    public static async insertPlaceholderRow(
        date: Date | string,
        lastParticipationScore: BigNumber,
        campaign: Campaign,
        user: User,
        participant: Participant
    ): Promise<DailyParticipantMetric> {
        const metric = new DailyParticipantMetric();
        metric.createdAt = new Date(date);
        metric.updatedAt = new Date(date);
        metric.campaign = campaign;
        metric.user = user;
        metric.participantId = participant.id;
        metric.participationScore = new BN(0);
        metric.totalParticipationScore = new BN(lastParticipationScore);
        await metric.save();
        return metric;
    }

    public static async getSortedByParticipantId(participantId: string): Promise<DailyParticipantMetric[]> {
        return this.createQueryBuilder("metrics")
            .where('metrics."participantId" = :id', { id: participantId })
            .orderBy('metrics."createdAt"', "ASC")
            .getMany();
    }

    public static async getLatestByParticipantId(participantId: string) {
        return await this.createQueryBuilder("metric")
            .where('metric."participantId" = :id', { id: participantId })
            .orderBy('metric."createdAt"', "DESC")
            .limit(1)
            .getOne();
    }

    public static async getSortedByUser(user: User, today: boolean): Promise<DailyParticipantMetric[]> {
        let where: { [key: string]: any } = { user };
        if (today) {
            const currentDate = new Date();
            const month =
                currentDate.getUTCMonth() + 1 < 10
                    ? `0${currentDate.getUTCMonth() + 1}`
                    : currentDate.getUTCMonth() + 1;
            const day = currentDate.getUTCDate() < 10 ? `0${currentDate.getUTCDate()}` : currentDate.getUTCDate();
            const yyymmdd = `${currentDate.getUTCFullYear()}-${month}-${day}`;
            where["createdAt"] = MoreThan(`${yyymmdd} 00:00:00`);
        }
        return await DailyParticipantMetric.find({
            where,
            relations: ["campaign"],
            order: { createdAt: "ASC" },
        });
    }

    public static async getAggregatedMetrics(participantId: string): Promise<AggregateDailyMetrics> {
        const yesterdayDate = new Date();
        yesterdayDate.setDate(new Date().getDate() - 1);
        yesterdayDate.setHours(0);
        yesterdayDate.setMinutes(0);
        yesterdayDate.setSeconds(0);
        yesterdayDate.setMilliseconds(0);
        const yesterday = DateUtils.mixedDateToDatetimeString(yesterdayDate);
        const todayDate = new Date();
        todayDate.setHours(0);
        todayDate.setMinutes(0);
        todayDate.setSeconds(0);
        todayDate.setMilliseconds(0);
        const today = DateUtils.mixedDateToDatetimeString(todayDate);
        const { clickCount, submissionCount, viewCount, likeCount, shareCount, commentCount } =
            await this.createQueryBuilder("metric")
                .select(
                    'SUM(CAST(metric."clickCount" AS int)) as "clickCount", SUM(CAST(metric."submissionCount" AS int)) as "submissionCount", SUM(CAST(metric."viewCount" AS int)) as "viewCount", SUM(CAST(metric."likeCount" as int)) as "likeCount", SUM(CAST(metric."shareCount" as int)) as "shareCount"'
                )
                .where(
                    `metric."participantId" = :participant AND metric."createdAt" >= '${yesterday}' AND metric."createdAt" < '${today}'`,
                    { participant: participantId }
                )
                .getRawOne();
        return {
            clickCount: clickCount || 0,
            submissionCount: submissionCount || 0,
            viewCount: viewCount || 0,
            likeCount: likeCount || 0,
            shareCount: shareCount || 0,
            commentCount: commentCount || 0,
        };
    }

    public static async getAggregatedOrgMetrics(orgId: string) {
        return await this.createQueryBuilder("metric")
            .select(
                'SUM(CAST(metric."clickCount" AS int)) as "clickCount", SUM(CAST(metric."viewCount" AS int)) as "viewCount", SUM(CAST(metric."shareCount" as int)) as "shareCount", SUM(CAST(metric."participationScore" as int)) as "participationScore"'
            )
            .innerJoin("metric.campaign", "campaign", 'campaign.id = metric."campaignId"')
            .innerJoin("campaign.org", "org", 'org.id = campaign."orgId"')
            .where("org.id = :orgId", { orgId })
            .groupBy("org.id")
            .getRawOne();
    }
    public static async getOrgMetrics(orgId: string) {
        return await this.createQueryBuilder("metric")
            .select([
                'SUM(CAST(metric."clickCount" AS int)) as "clickCount", SUM(CAST(metric."viewCount" AS int)) as "viewCount", SUM(CAST(metric."shareCount" as int)) as "shareCount", SUM(CAST(metric."participationScore" as int)) as "participationScore"',
            ])
            .innerJoin("metric.campaign", "campaign", 'campaign.id = metric."campaignId"')
            .innerJoin("campaign.org", "org", 'org.id = campaign."orgId"')
            .where("org.id = :orgId", { orgId })
            .groupBy("campaign.id")
            .getRawMany();
    }

    public static async getAggregatedCampaignMetrics(campaignId: string) {
        return await this.createQueryBuilder("metric")
            .select(
                'SUM(CAST(metric."clickCount" AS int)) as "clickCount", SUM(CAST(metric."viewCount" AS int)) as "viewCount", SUM(CAST(metric."shareCount" as int)) as "shareCount", SUM(CAST(metric."participationScore" as int)) as "participationScore"'
            )
            .innerJoin("metric.campaign", "campaign", 'campaign.id = metric."campaignId"')
            .addSelect('campaign.name as "campaignName"')
            .where("metric.campaignId = :campaignId", { campaignId })
            .groupBy("campaign.name")
            .getRawOne();
    }

    public static async getCampaignMetrics(campaignId: string) {
        return await this.createQueryBuilder("metric")
            .select(
                'SUM(CAST(metric."clickCount" AS int)) as "clickCount", SUM(CAST(metric."viewCount" AS int)) as "viewCount", SUM(CAST(metric."shareCount" as int)) as "shareCount", SUM(CAST(metric."participationScore" as int)) as "participationScore"'
            )
            .where("metric.campaignId = :campaignId", { campaignId })
            .groupBy("metric.id")
            .getRawMany();
    }

    public static async getPreviousDayMetricsForAllCampaigns(campaignIds: string[]): Promise<DailyParticipantMetric[]> {
        const yesterdayDate = new Date();
        yesterdayDate.setDate(new Date().getDate() - 1);
        yesterdayDate.setHours(0);
        yesterdayDate.setMinutes(0);
        yesterdayDate.setSeconds(0);
        yesterdayDate.setMilliseconds(0);
        const yesterday = DateUtils.mixedDateToDatetimeString(yesterdayDate);
        const todayDate = new Date();
        todayDate.setHours(0);
        todayDate.setMinutes(0);
        todayDate.setSeconds(0);
        todayDate.setMilliseconds(0);
        const today = DateUtils.mixedDateToDatetimeString(todayDate);
        return this.createQueryBuilder("metric")
            .leftJoinAndSelect("metric.user", "user", 'user.id = metric."userId"')
            .leftJoinAndSelect("metric.campaign", "campaign", 'campaign.id = metric."campaignId"')
            .where(
                `campaign.id IN (:...ids) AND campaign."endDate" >= '${yesterday}' AND metric."createdAt" < '${today}' AND metric."createdAt" >= '${yesterday}'`,
                { ids: campaignIds }
            )
            .orderBy('metric."createdAt"', "DESC")
            .getMany();
    }

    public static async getPreviousDayMetricForUser(userId: string): Promise<DailyParticipantMetric | undefined> {
        return await this.createQueryBuilder("metric")
            .leftJoinAndSelect("metric.user", "user", 'metric."userId" = user.id')
            .where("user.id = :id", { id: userId })
            .orderBy('metric."createdAt"', "DESC")
            .limit(1)
            .getOne();
    }

    public static async getAccumulatedParticipantMetrics(participantId: string) {
        return await this.createQueryBuilder("metric")
            .select(
                'SUM(CAST(metric."clickCount" AS int)) as "clickCount", SUM(CAST(metric."commentCount" AS int)) as "commentCount", SUM(CAST(metric."viewCount" AS int)) as "viewCount", SUM(CAST(metric."shareCount" as int)) as "shareCount", SUM(CAST(metric."likeCount" AS int)) as "likeCount", SUM(CAST(metric."submissionCount" AS int)) as "submissionCount", SUM(CAST(metric."participationScore" as int)) as "participationScore"'
            )
            .where('metric."participantId" = :id', { id: participantId })
            .getRawOne();
    }

    public static async getAccumulatedUserMetrics(participantIds: string[]) {
        return await this.createQueryBuilder("metric")
            .select(
                'SUM(CAST(metric."clickCount" AS int)) as "clickCount", SUM(CAST(metric."commentCount" AS int)) as "commentCount", SUM(CAST(metric."viewCount" AS int)) as "viewCount", SUM(CAST(metric."shareCount" as int)) as "shareCount", SUM(CAST(metric."likeCount" AS int)) as "likeCount", SUM(CAST(metric."submissionCount" AS int)) as "submissionCount", SUM(CAST(metric."participationScore" as int)) as "participationScore"'
            )
            .where('metric."participantId" IN (:...ids)', { ids: participantIds })
            .getRawOne();
    }
}
