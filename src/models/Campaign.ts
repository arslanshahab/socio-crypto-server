import { BaseEntity, Entity, Column, OneToMany, PrimaryGeneratedColumn } from 'typeorm';
import { DateUtils } from 'typeorm/util/DateUtils';
import { Participant } from './Participant';
import { checkPermissions } from '../middleware/authentication';

@Entity()
export class Campaign extends BaseEntity {
  @PrimaryGeneratedColumn('uuid')
  public id: string;

  @Column({ nullable: false })
  public name: string;

  @Column({ type: 'timestamptz', nullable: true })
  public beginDate: Date;

  @Column({ type: 'timestamptz', nullable: true })
  public endDate: Date;

  @Column({ type: 'numeric' })
  public coiinTotal: number;

  @Column()
  public target: string;

  @Column({ default: "", nullable: true })
  public description: string;

  @Column({ nullable: false, default: 'raiinmaker' })
  public company: string;

  @OneToMany(
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    _type => Participant,
    participant => participant.campaign,
  )
  public participants: Participant[];

  public static async findCampaignsByStatus(open: boolean, skip: number, take: number) {
    let where = '';
    const now = DateUtils.mixedDateToDatetimeString(new Date());
    if (open !== null && open === true) {
      where = `("beginDate" IS NOT NULL AND "endDate" IS NOT NULL AND "beginDate" <= '${now}' AND "endDate" >= '${now}') OR ("beginDate" IS NOT NULL AND "endDate" IS NULL AND "beginDate" <= '${now}') OR ("endDate" IS NOT NULL AND "beginDate" IS NULL AND "endDate" >= '${now}')`;
    } else if (open !== null && open === false) {
      where = `("beginDate" IS NOT NULL AND "endDate" IS NOT NULL AND "beginDate" >= '${now}' AND "endDate" <= '${now}') OR ("beginDate" IS NOT NULL AND "endDate" IS NULL AND "beginDate" >= '${now}') OR ("endDate" IS NOT NULL AND "beginDate" IS NULL AND "endDate" <= '${now}')`;
    }
    return await this.createQueryBuilder('campaign')
      .where(where)
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

  public static async updateCampaign(args: { id: string, name: string, beginDate: string, endDate: string, coiinTotal: number, target: string, description: string }, context: { user: any }): Promise<Campaign> {
    const { role, company } = checkPermissions({ hasRole: ['admin', 'manager'] }, context);
    const { id, name, beginDate, endDate, coiinTotal, target, description } = args;
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
    await campaign.save();
    return campaign;
  }

  public static async newCampaign(args: { name: string, beginDate: string, endDate: string, coiinTotal: number, target: string, description: string, company: string }, context: { user: any }): Promise<Campaign> {
    const { role, company } = checkPermissions({ hasRole: ['admin', 'manager'] }, context);
    const { name, beginDate, endDate, coiinTotal, target, description } = args;
    if (role === 'admin' && !args.company) throw new Error('administrators need to specify a company in args');
    const campaign = new Campaign();
    campaign.name = name
    campaign.coiinTotal = coiinTotal;
    campaign.target = target;
    campaign.company = (role === 'admin') ? args.company : company;
    if (beginDate) campaign.beginDate = new Date(beginDate);
    if (endDate) campaign.endDate = new Date(endDate);
    if (description) campaign.description = description;
    await campaign.save();
    return campaign;
  }

  public static async list(args: { open: boolean, skip: number, take: number }): Promise<{ results: Campaign[], total: number }> {
    const { skip = 0, take = 10 } = args;
    const [results, total] = await Campaign.findCampaignsByStatus(args.open, skip, take);
    return { results, total };
  }
}