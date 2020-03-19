import { BaseEntity, Entity, Column, PrimaryColumn, OneToMany } from 'typeorm';
import { DateUtils } from 'typeorm/util/DateUtils';
import { Participant } from './Participant';

@Entity()
export class Campaign extends BaseEntity {
  @PrimaryColumn()
  public id: string;

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

  @OneToMany(
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    _type => Participant,
    participant => participant.campaign,
  )
  public participants: Participant[];

  public static async findCampaignsByStatus(open?: boolean) {
    let where = '';
    const now = DateUtils.mixedDateToDatetimeString(new Date());
    if (open !== null && open === true) {
      where = `("beginDate" IS NOT NULL AND "endDate" IS NOT NULL AND "beginDate" <= '${now}' AND "endDate" >= '${now}') OR ("beginDate" IS NOT NULL AND "endDate" IS NULL AND "beginDate" <= '${now}') OR ("endDate" IS NOT NULL AND "beginDate" IS NULL AND "endDate" >= '${now}')`;
    } else if (open !== null && open === false) {
      where = `("beginDate" IS NOT NULL AND "endDate" IS NOT NULL AND "beginDate" >= '${now}' AND "endDate" <= '${now}') OR ("beginDate" IS NOT NULL AND "endDate" IS NULL AND "beginDate" >= '${now}') OR ("endDate" IS NOT NULL AND "beginDate" IS NULL AND "endDate" <= '${now}')`;
    }
    return await this.createQueryBuilder()
      .where(where)
      .getManyAndCount();
  }

  public static async deleteCampaign(args: { name: string }): Promise<Campaign> {
    const campaign = await Campaign.findOne({ where: { id: args.name }, relations: ['participants'] });
    if (!campaign) throw new Error('campaign not found');
    await campaign.remove();
    return campaign;
  }

  public static async updateCampaign(args: { name: string, beginDate: string, endDate: string, coiinTotal: number, target: string, description: string }): Promise<Campaign> {
    const { name, beginDate, endDate, coiinTotal, target, description } = args;
    const campaign = await Campaign.findOne({ where: { id: name } });
    if (!campaign) throw new Error('campaign not found');
    if (beginDate) campaign.beginDate = new Date(beginDate);
    if (endDate) campaign.endDate = new Date(endDate);
    if (coiinTotal) campaign.coiinTotal = coiinTotal;
    if (target) campaign.target = target;
    if (description) campaign.description = description;
    await campaign.save();
    return campaign;
  }

  public static async newCampaign(args: { name: string, beginDate: string, endDate: string, coiinTotal: number, target: string, description: string }): Promise<Campaign> {
    const { name, beginDate, endDate, coiinTotal, target, description } = args;
    if (await Campaign.findOne({ where: { id: name } })) throw new Error('campaign already registered');
    const campaign = new Campaign();
    campaign.id = name;
    campaign.coiinTotal = coiinTotal;
    campaign.target = target;
    if (beginDate) campaign.beginDate = new Date(beginDate);
    if (endDate) campaign.endDate = new Date(endDate);
    if (description) campaign.description = description;
    await campaign.save();
    return campaign;
  }

  public static async list(args: { open: boolean }): Promise<{ results: Campaign[], total: number }> {
    const [results, total] = await Campaign.findCampaignsByStatus(args.open);
    return { results, total };
  }
}