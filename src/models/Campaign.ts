import { BaseEntity, Entity, Column, OneToMany, PrimaryGeneratedColumn } from 'typeorm';
import { DateUtils } from 'typeorm/util/DateUtils';
import { Participant } from './Participant';
import { checkPermissions } from '../middleware/authentication';
import {AlgorithmSpecs, Tiers} from '../types';
import { Validator } from '../schemas';

@Entity()
export class Campaign extends BaseEntity {
  public static validate = new Validator();
  @PrimaryGeneratedColumn('uuid')
  public id: string;

  @Column({ nullable: false })
  public name: string;

  @Column({ type: 'timestamptz', nullable: false })
  public beginDate: Date;

  @Column({ type: 'timestamptz', nullable: false })
  public endDate: Date;

  @Column({ type: 'numeric' })
  public coiinTotal: number;

  @Column({ type: 'bigint', nullable: false, default: 0 })
  public totalParticipationScore: BigInt;

  @Column()
  public target: string;

  @Column({ default: "", nullable: true })
  public description: string;

  @Column({ nullable: false, default: 'raiinmaker' })
  public company: string;

  @Column({type: "jsonb", nullable: false })
  public algorithm: AlgorithmSpecs;

  @Column({ nullable: false, default: false })
  public audited: boolean;

  @Column({ nullable: true })
  public targetVideo: string;

  @OneToMany(
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    _type => Participant,
    participant => participant.campaign,
  )
  public participants: Participant[];

  isOpen() {
    const now = new Date();
    if (new Date(this.beginDate).getTime() <= now.getTime() && new Date(this.endDate).getTime() >= now.getTime()) return true;
    return false;
  }

  public static async calculateTier(totalParticipation: BigInt, tiers: Tiers, initialTotal: number) {
    let currentTier = 0;
    let currentTotal = 0;
    for(let key in tiers) {
      if (totalParticipation < BigInt(tiers[key].threshold)) {
        if (Number(key) < 2) {
          currentTier = 1;
          currentTotal = initialTotal;
          return { currentTier, currentTotal };
        } else {
          const previousTier = Number(key) - 1;
          currentTier = previousTier;
          currentTotal = tiers[String(previousTier)].totalCoiins;
          return { currentTier, currentTotal };
        }
      }
    }

    return { currentTier, currentTotal };
  }

  public static async getCurrentCampaignTier(args: { campaignId?: string, campaign?: Campaign }): Promise<{ currentTier: number, currentTotal: number }> {
    const { campaignId, campaign } = args;
    let currentTierSummary;
    if (campaignId) {
      const where: {[key: string]: string } = { 'id': campaignId };
      const currentCampaign = await Campaign.findOne({ where });
      if (!currentCampaign) throw new Error('campaign not found');
      currentTierSummary = await Campaign.calculateTier(currentCampaign.totalParticipationScore, currentCampaign.algorithm.tiers, currentCampaign.algorithm.initialTotal);
    } else if (campaign) {
      currentTierSummary = await Campaign.calculateTier(campaign.totalParticipationScore, campaign.algorithm.tiers, campaign.algorithm.initialTotal);
    }
    if (!currentTierSummary) throw new Error('failure calculating current tier');
    return currentTierSummary;
  }

  public static async findCampaignsByStatus(open: boolean, skip: number, take: number, company: string) {
    let where = '';
    const now = DateUtils.mixedDateToDatetimeString(new Date());
    if (open !== null && open === true) {
      where = `("beginDate" <= '${now}' AND "endDate" >= '${now}')`;
    } else if (open !== null && open === false) {
      where = `("beginDate" >= '${now}' OR "endDate" <= '${now}')`;
    }
    let query = this.createQueryBuilder('campaign')
      .where(where);
    if (company) query = query.andWhere(`"company"=:company`, { company })
    return await query
      .leftJoinAndSelect('campaign.participants', 'participant', 'participant."campaignId" = campaign.id')
      .leftJoinAndSelect('participant.user', 'user', 'user.id = participant."userId"')
      .skip(skip)
      .take(take)
      .getManyAndCount();
  }

  public static async findCampaignParticipantsById(args: {id: string, company: string}): Promise<Campaign | undefined> {
    const { id, company } = args;
    let query = this.createQueryBuilder('campaign');
    return query
        .leftJoinAndSelect('campaign.participants', 'participant', 'participant."campaignId" = campaign.id')
        .leftJoinAndSelect('participant.user', 'user', 'user.id = participant."userId"')
        .leftJoinAndSelect('user.wallet', 'wallet', 'wallet."userId" = user.id')
        .where('campaign.company = :company AND campaign.id = :id', { company, id })
        .getOne()
  }

  public static async deleteCampaign(args: { id: string }, context: { user: any }): Promise<Campaign> {
    const { role, company } = checkPermissions({ hasRole: ['admin', 'manager'] }, context);
    const where: {[key: string]: string} = { id: args.id };
    if (role === 'manager') where['company'] = company;
    const campaign = await Campaign.findOne({ where, relations: ['participants'] });
    if (!campaign) throw new Error('campaign not found');
    await Participant.remove(campaign.participants);
    await campaign.remove();
    return campaign;
  }

  public static async updateCampaign(args: { id: string, name: string, beginDate: string, targetVideo: string, endDate: string, coiinTotal: number, target: string, description: string, algorithm: string }, context: { user: any }): Promise<Campaign> {
    const { role, company } = checkPermissions({ hasRole: ['admin', 'manager'] }, context);
    const { id, name, beginDate, endDate, coiinTotal, target, description, algorithm, targetVideo } = args;
    Campaign.validate.validateAlgorithmCreateSchema(JSON.parse(algorithm));
    const where: {[key: string]: string} = { id };
    if (role === 'manager') where['company'] = company;
    const campaign = await Campaign.findOne({ where });
    if (!campaign) throw new Error('campaign not found');
    if (name) campaign.name = name;
    if (beginDate) campaign.beginDate = new Date(beginDate);
    if (endDate) campaign.endDate = new Date(endDate);
    if (coiinTotal) campaign.coiinTotal = coiinTotal;
    if (target) campaign.target = target;
    if (description) campaign.description = description;
    if (algorithm) campaign.algorithm = JSON.parse(algorithm);
    if (targetVideo) campaign.targetVideo = targetVideo;
    await campaign.save();
    return campaign;
  }

  public static async newCampaign(args: { name: string, targetVideo: string, beginDate: string, endDate: string, coiinTotal: number, target: string, description: string, company: string, algorithm: string }, context: { user: any }): Promise<Campaign> {
    const { role, company } = checkPermissions({ hasRole: ['admin', 'manager'] }, context);
    const { name, beginDate, endDate, coiinTotal, target, description, algorithm, targetVideo } = args;
    Campaign.validate.validateAlgorithmCreateSchema(JSON.parse(algorithm));
    if (role === 'admin' && !args.company) throw new Error('administrators need to specify a company in args');
    const campaign = new Campaign();
    campaign.name = name;
    campaign.coiinTotal = coiinTotal;
    campaign.target = target;
    campaign.company = (role === 'admin') ? args.company : company;
    campaign.beginDate = new Date(beginDate);
    campaign.endDate = new Date(endDate);
    campaign.algorithm = JSON.parse(algorithm);
    campaign.targetVideo = targetVideo;
    if (description) campaign.description = description;
    await campaign.save();
    return campaign;
  }

  public static async list(args: { open: boolean, skip: number, take: number, scoped: boolean }, context: { user: any }): Promise<{ results: Campaign[], total: number }> {
    const { open, skip = 0, take = 10, scoped = false } = args;
    const { company } = context.user;
    const [results, total] = await Campaign.findCampaignsByStatus(open, skip, take, scoped && company);
    return { results, total };
  }

  public static async findCampaignById(args: {id: string, company: string}) {
    const {id, company} = args;
    const campaign = await Campaign.findCampaignParticipantsById({id, company});
    if (!campaign) throw new Error('Campaign not found');
    return campaign;
  }

  public static async get(args: { id: string }): Promise<Campaign> {
    const { id } = args;
    const where: { [key: string]: string } = { id };
    const campaign = await Campaign.findOne({ where, relations: ['participants'] });
    if (!campaign) throw new Error('campaign not found');
    return campaign;
  }

  public static async publicGet(args: { campaignId: string }): Promise<Campaign> {
    const { campaignId } = args;
    const campaign = await Campaign.findOne({ where: { id: campaignId } });
    if (!campaign) throw new Error('campaign not found');
    return campaign;
  }

}
