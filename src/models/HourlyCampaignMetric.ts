import {
  BaseEntity,
  Column,
  CreateDateColumn,
  Entity,
  ManyToOne, MoreThan,
  PrimaryGeneratedColumn,
  UpdateDateColumn
} from "typeorm";
import {BigNumberEntityTransformer} from "../util/transformers";
import {BigNumber} from "bignumber.js";
import {Campaign} from "./Campaign";
import {Org} from "./Org";
import {BN} from "../util/helpers";
import {
  CampaignMetricsGroupedByDateParsed,
  HourlyMetricsGroupedByDateQueryResult,
  DateTrunc,
  PlatformMetricsGroupedByDateParsed
} from "../types";
import {Validator} from "../schemas";
import {DateUtils} from "typeorm/util/DateUtils";

@Entity()
export class HourlyCampaignMetric extends BaseEntity {
  public static validate = new Validator();
  @PrimaryGeneratedColumn('uuid')
  public id: string;

  @Column({ type: 'varchar', nullable: false, default: 0, transformer: BigNumberEntityTransformer })
  public postCount: BigNumber;

  @Column({ type: 'varchar', nullable: false, default: 0, transformer: BigNumberEntityTransformer })
  public participantCount: BigNumber;

  @Column({ type: 'varchar', nullable: false, default: 0, transformer: BigNumberEntityTransformer })
  public clickCount: BigNumber;

  @Column({ type: 'varchar', nullable: false, default: 0, transformer: BigNumberEntityTransformer })
  public viewCount: BigNumber;

  @Column({ type: 'varchar', nullable: false, default: 0, transformer: BigNumberEntityTransformer })
  public submissionCount: BigNumber;

  @Column({type: 'varchar', nullable: false, default: 0, transformer: BigNumberEntityTransformer})
  public likeCount: BigNumber;

  @Column({type: 'varchar', nullable: false, default: 0, transformer: BigNumberEntityTransformer})
  public shareCount: BigNumber;

  @Column({type: 'varchar', nullable: false, default: 0, transformer: BigNumberEntityTransformer})
  public commentCount: BigNumber;

  @CreateDateColumn()
  public createdAt: Date;

  @UpdateDateColumn()
  public updatedAt: Date;

  @ManyToOne(
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    _type => Campaign,
    campaign => campaign.hourlyMetrics
  )
  public campaign: Campaign;

  @ManyToOne(
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    _type => Org,
    org => org.hourlyMetrics
  )
  public org: Org;

  public asV1() {
    const returnValue: HourlyCampaignMetric = {
      ...this,
      clickCount: this.clickCount.toNumber(),
      viewCount: this.viewCount.toNumber(),
      submissionCount: this.submissionCount.toNumber(),
      likeCount: this.likeCount.toNumber(),
      shareCount: this.shareCount.toNumber(),
      commentCount: this.commentCount.toNumber(),
      participantCount: parseFloat(this.participantCount.toString()),
      postCount: parseFloat(this.postCount.toString()),
    }
    if (this.campaign) returnValue.campaign = this.campaign.asV1();
    return returnValue;
  }

  public static parseHourlyCampaignMetrics(hourlyMetrics: HourlyMetricsGroupedByDateQueryResult[], filter: DateTrunc, currentTotal: BigNumber) {
    const response: CampaignMetricsGroupedByDateParsed[] = [];
    try {
      for (const metric of hourlyMetrics) {
        // Discovery Costs
        const likesCost = currentTotal.div(metric.likeCount);
        const sharesCost = currentTotal.div(metric.shareCount);
        const commentCost = currentTotal.div(metric.commentCount);
        const discoveryCost = likesCost.plus(sharesCost).plus(commentCost);
        // Conversion Costs
        const submissionCost = currentTotal.div(metric.submissionCount);
        const viewsCost = currentTotal.div(metric.viewCount);
        const clicksCost = currentTotal.div(metric.clickCount);
        const conversionCost = submissionCost.plus(viewsCost).plus(clicksCost);
        // Average costs
        const averagePostCost = parseFloat(currentTotal.div(metric.postCount).toString());
        const averageDiscoveryCost = parseFloat(discoveryCost.div(Number(metric.likeCount) + Number(metric.shareCount) + Number(metric.commentCount)).toString())
        const averageConversionCost = parseFloat(conversionCost.div(Number(metric.submissionCount) + Number(metric.viewCount) + Number(metric.clickCount)).toString())

        response.push({
          interval: metric.interval.toISOString(),
          postCount: Number(metric.postCount),
          participantCount: Number(metric.participantCount),
          clickCount: Number(metric.clickCount),
          viewCount: Number(metric.viewCount),
          submissionCount: Number(metric.submissionCount),
          likeCount: Number(metric.likeCount),
          shareCount: Number(metric.shareCount),
          commentCount: Number(metric.commentCount),
          totalDiscoveries: Number(metric.likeCount) + Number(metric.shareCount) + Number(metric.commentCount),
          totalConversions: Number(metric.clickCount) + Number(metric.viewCount) + Number(metric.submissionCount),
          averagePostCost: averagePostCost === Infinity ? 0 : averagePostCost,
          averageDiscoveryCost: averageDiscoveryCost === Infinity ? 0 : averageDiscoveryCost,
          averageConversionCost: averageConversionCost === Infinity ? 0 : averageConversionCost
        })
      }
    } catch (e) {
      console.log('ERROR: ', e);
    }

    return response;
  }

  public static parseHourlyPlatformMetrics(hourlyMetrics: HourlyMetricsGroupedByDateQueryResult[], filter: DateTrunc) {
    const response: PlatformMetricsGroupedByDateParsed[] = [];
    try {
      for (const metric of hourlyMetrics) {
        response.push({
          interval: metric.interval.toISOString(),
          postCount: Number(metric.postCount),
          participantCount: Number(metric.participantCount),
          clickCount: Number(metric.clickCount),
          viewCount: Number(metric.viewCount),
          submissionCount: Number(metric.submissionCount),
          likeCount: Number(metric.likeCount),
          shareCount: Number(metric.shareCount),
          commentCount: Number(metric.commentCount),
          totalDiscoveries: Number(metric.likeCount) + Number(metric.shareCount) + Number(metric.commentCount),
          totalConversions: Number(metric.clickCount) + Number(metric.viewCount) + Number(metric.submissionCount),
        })
      }
    } catch (e) {
      console.log('ERROR: ', e);
    }

    return response;
  }

  public static async upsert(
    campaign: Campaign,
    org: Org,
    action: 'clicks'|'views'|'submissions'|'likes'|'shares'|'comments'|'participate'|'removeParticipant'|'post',
    actionCount: number = 1
  ) {
    if(!['clicks','views','submissions','likes','shares','comments','participate','post','removeParticipant'].includes(action)) throw new Error('action not supported');
    const currentDate = new Date();
    const month = (currentDate.getUTCMonth() + 1) < 10 ? `0${currentDate.getUTCMonth() + 1}` : currentDate.getUTCMonth() + 1;
    const day = currentDate.getUTCDate() < 10 ? `0${currentDate.getUTCDate()}` : currentDate.getUTCDate();
    const hour = currentDate.getUTCHours() < 10 ? `0${currentDate.getUTCHours()}` : currentDate.getUTCHours();
    const yyymmddhh = `${currentDate.getUTCFullYear()}-${month}-${day} ${hour}:00:00`;
    let record = await HourlyCampaignMetric.findOne({ where: { campaign, createdAt: MoreThan(yyymmddhh) } });
    if (!record) {
      record = new HourlyCampaignMetric();
      record.campaign = campaign;
      record.org = org;
    }
    switch (action) {
      case 'clicks':
        record.clickCount = (record.clickCount) ? record.clickCount.plus(new BN(actionCount)) : new BN(actionCount);
        break;
      case 'views':
        record.viewCount = (record.viewCount) ? record.viewCount.plus(new BN(actionCount)) : new BN(actionCount);
        break;
      case 'submissions':
        record.submissionCount = (record.submissionCount) ? record.submissionCount.plus(new BN(actionCount)) : new BN(actionCount);
        break;
      case 'likes':
        record.likeCount = (record.likeCount) ? record.likeCount.plus(new BN(actionCount)) : new BN(actionCount);
        break;
      case 'shares':
        record.shareCount = (record.shareCount) ? record.shareCount.plus(new BN(actionCount)) : new BN(actionCount);
        break;
      case 'comments':
        record.commentCount = (record.commentCount) ? record.commentCount.plus(new BN(actionCount)) : new BN(actionCount);
        break;
      case "participate":
        record.participantCount = record.participantCount ? record.participantCount.plus(new BN(actionCount)) : new BN(actionCount);
        break;
      case "post":
        record.postCount = record.postCount ? record.postCount.plus(new BN(actionCount)) : new BN(actionCount);
        break;
      case "removeParticipant":
        if (record.participantCount) record.participantCount = record.participantCount.minus(1);
        break;
    }
    await record.save();
    return record;
  }

  public static async getDateGroupedMetrics(dateTrunc: DateTrunc, startDate: string, endDate: string, campaignId?: string): Promise<HourlyMetricsGroupedByDateQueryResult[]> {
    const startISO = new Date(startDate).toISOString();
    const endISO = new Date(endDate).toISOString()
    if (dateTrunc === 'all') {
      const start = new Date(startDate);
      const end = new Date(endDate);
      const totalDays = (end.getTime() - start.getTime()) / (1000 * 3600 * 24);
      dateTrunc = totalDays > 183? 'month' : 'week';
    }
    return HourlyCampaignMetric.query(this.getDateTruncQuery(dateTrunc, startISO, endISO, campaignId))
  }

  public static async getHourlyParticipantCount(startDate: string, endDate: string, campaignId?: string) {
    const start = DateUtils.mixedDateToDatetimeString(new Date(startDate));
    const end = DateUtils.mixedDateToDatetimeString(new Date(endDate));
    let query = this.createQueryBuilder('metrics')
      .where(`"createdAt" >= :start`, {start})
      .andWhere(`"createdAt" <= :end`, {end})
    if (campaignId) query = query.andWhere(`"campaignId"=:campaignId`, {campaignId})
    return await query
      .select('"participantCount", "createdAt"')
      .distinct(true)
      .orderBy('metrics."createdAt"', 'DESC')
      .getMany();
  }

  public static getDateTruncQuery(dateTrunc: string, startDate: string, endDate: string, campaignId?: string) {
    if (campaignId) {
      return `with range_values as (
                select date_trunc('${dateTrunc}', min(cast('${startDate}' as date))) as minval,
                       date_trunc('${dateTrunc}', max(cast('${endDate}' as date))) as maxval
                from hourly_campaign_metric
                ),
                range as (
                 select generate_series(minval, maxval, '1 ${dateTrunc}'::interval) as ${dateTrunc}
                 from range_values
                ),
                pCounts as (
                    select date_trunc('${dateTrunc}', "createdAt") as ${dateTrunc},
                           "participantCount"
                     from (
                           select distinct on (extract(${dateTrunc} from t."createdAt")) "createdAt" ,
                           "participantCount"
                           from hourly_campaign_metric t
                           WHERE "campaignId" = '${campaignId}'
                         ) t
                    order by "createdAt" desc
                ),
                counts as (
                 SELECT t."campaignId",
                     date_trunc('${dateTrunc}', "createdAt") as ${dateTrunc},
                     SUM(CAST(t."postCount" as int)) as "postCount",
                     SUM(CAST(t."clickCount" as int)) as "clickCount",
                     SUM(CAST(t."viewCount" as int)) as "viewCount",
                     SUM(CAST(t."submissionCount" as int)) as "submissionCount",
                     SUM(CAST(t."likeCount" as int)) as "likeCount",
                     SUM(CAST(t."shareCount" as int)) as "shareCount",
                     SUM(CAST(t."commentCount" as int)) as "commentCount"
                FROM public.hourly_campaign_metric t
                WHERE "campaignId" = '${campaignId}'
                GROUP BY t."campaignId", ${dateTrunc}
                ORDER BY ${dateTrunc} desc
                )
                select range.${dateTrunc} as interval,
                       coalesce(cast("participantCount" as int), 0) as "participantCount",
                       coalesce("postCount", 0) as "postCount",
                       coalesce("clickCount", 0) as "clickCount",
                       coalesce("viewCount", 0) as "viewCount",
                       coalesce("submissionCount", 0) as "submissionCount",
                       coalesce("likeCount", 0) as "likeCount",
                       coalesce("shareCount", 0) as "shareCount",
                       coalesce("commentCount", 0) as "commentCount"
                from range
                left outer join counts on range.${dateTrunc} = counts.${dateTrunc}
                left join pCounts on range.${dateTrunc} = pCounts.${dateTrunc};`
    }
    return `with range_values as (
                select date_trunc('${dateTrunc}', min(cast('${startDate}' as date))) as minval,
                       date_trunc('${dateTrunc}', max(cast('${endDate}' as date))) as maxval
                from hourly_campaign_metric
                ),
                range as (
                 select generate_series(minval, maxval, '1 ${dateTrunc}'::interval) as ${dateTrunc}
                 from range_values
                ),
                pCounts as (
                    select date_trunc('${dateTrunc}', "createdAt") as ${dateTrunc},
                           "participantCount"
                     from (
                           select distinct on (extract(${dateTrunc} from t."createdAt")) "createdAt" ,
                           "participantCount"
                           from hourly_campaign_metric t
                         ) t
                    order by "createdAt" desc
                ),
                counts as (
                 SELECT t."orgId",
                     date_trunc('${dateTrunc}', "createdAt") as ${dateTrunc},
                     SUM(CAST(t."postCount" as int)) as "postCount",
                     SUM(CAST(t."clickCount" as int)) as "clickCount",
                     SUM(CAST(t."viewCount" as int)) as "viewCount",
                     SUM(CAST(t."submissionCount" as int)) as "submissionCount",
                     SUM(CAST(t."likeCount" as int)) as "likeCount",
                     SUM(CAST(t."shareCount" as int)) as "shareCount",
                     SUM(CAST(t."commentCount" as int)) as "commentCount"
                FROM public.hourly_campaign_metric t
                GROUP BY t."orgId", ${dateTrunc}
                ORDER BY ${dateTrunc} desc
                )
                select range.${dateTrunc} as interval,
                       coalesce(cast("participantCount" as int), 0) as "participantCount",
                       coalesce("postCount", 0) as "postCount",
                       coalesce("clickCount", 0) as "clickCount",
                       coalesce("viewCount", 0) as "viewCount",
                       coalesce("submissionCount", 0) as "submissionCount",
                       coalesce("likeCount", 0) as "likeCount",
                       coalesce("shareCount", 0) as "shareCount",
                       coalesce("commentCount", 0) as "commentCount"
                from range
                left outer join counts on range.${dateTrunc} = counts.${dateTrunc}
                left join pCounts on range.${dateTrunc} = pCounts.${dateTrunc};`
  }


  public static async getSortedByOrgId(orgId: string): Promise<HourlyCampaignMetric[]> {
    return this.createQueryBuilder('metrics')
      .where('metrics."orgId" = :id', {id: orgId})
      .orderBy('metrics."createdAt"', 'ASC')
      .getMany();
  }
}
