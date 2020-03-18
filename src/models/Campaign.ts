import { BaseEntity, Entity, Column, PrimaryColumn, OneToMany } from 'typeorm';
import { DateUtils } from 'typeorm/util/DateUtils';
import { Participant } from './Participant';

@Entity()
export class Campaign extends BaseEntity {
  @PrimaryColumn()
  public id: string;

  @Column({ type: 'timestamptz', nullable: true })
  public beginDate: string;

  @Column({ type: 'timestamptz', nullable: true })
  public endDate: string;

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
    if (beginDate) campaign.beginDate = beginDate;
    if (endDate) campaign.endDate = endDate;
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
    if (beginDate) campaign.beginDate = beginDate;
    if (endDate) campaign.endDate = endDate;
    campaign.coiinTotal = coiinTotal;
    campaign.target = target;
    if (description) campaign.description = description;
    await campaign.save();
    return campaign;
  }

  public static async list(): Promise<{ results: Campaign[], total: number }> {
    const [results, total] = await Campaign.findAndCount();
    return { results, total };
  }
}