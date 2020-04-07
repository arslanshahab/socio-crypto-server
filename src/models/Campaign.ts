import { BaseEntity, Entity, Column, OneToMany, PrimaryGeneratedColumn } from 'typeorm';
import { DateUtils } from 'typeorm/util/DateUtils';
import { Participant } from './Participant';
import { checkPermissions } from '../middleware/authentication';
import {AlgorithmSpecs, CampaignAuditReport} from '../types';
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

  @OneToMany(
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    _type => Participant,
    participant => participant.campaign,
  )
  public participants: Participant[];

  isOpen() {
    const now = new Date();
    if (new Date(this.beginDate).getTime() <= now.getTime() || new Date(this.endDate).getTime() >= now.getTime()) return true;
    return false;
  }

  public static async findCampaignParticipant(id: string) {

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

  public static async updateCampaign(args: { id: string, name: string, beginDate: string, endDate: string, coiinTotal: number, target: string, description: string, algorithm: string }, context: { user: any }): Promise<Campaign> {
    const { role, company } = checkPermissions({ hasRole: ['admin', 'manager'] }, context);
    const { id, name, beginDate, endDate, coiinTotal, target, description, algorithm } = args;
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
    await campaign.save();
    return campaign;
  }

  public static async newCampaign(args: { name: string, beginDate: string, endDate: string, coiinTotal: number, target: string, description: string, company: string, algorithm: string }, context: { user: any }): Promise<Campaign> {
    const { role, company } = checkPermissions({ hasRole: ['admin', 'manager'] }, context);
    const { name, beginDate, endDate, coiinTotal, target, description, algorithm } = args;
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

  public static async get(args: { id: string }): Promise<Campaign> {
    const { id } = args;
    const where: { [key: string]: string } = { id };
    const campaign = await Campaign.findOne({ where, relations: ['participants'] });
    if (!campaign) throw new Error('campaign not found');
    return campaign;
  }

}
