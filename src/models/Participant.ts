import { BaseEntity, Entity, Column, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';
import { Dragonchain } from '../clients/dragonchain';
import { Campaign } from './Campaign';
import { User } from './User';
import { constructHostUrl } from '../util/helpers';

@Entity()
export class Participant extends BaseEntity {
  @PrimaryGeneratedColumn('uuid')
  public id: string;

  @Column({ nullable: false, default: 0 })
  public clickCount: number;

  @Column({ nullable: false, default: 0 })
  public viewCount: number;

  @Column({ nullable: false, default: 0 })
  public submissionCount: number;

  @Column({  type: 'bigint', nullable: false, default: 0 })
  public participationScore: BigInt;

  @ManyToOne(
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    _type => User,
    user => user.campaigns,
    { primary: true, eager: true }
  )
  public user: User;

  @ManyToOne(
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    _type => Campaign,
    campaign => campaign.participants,
    { primary: true, eager: true }
  )
  public campaign: Campaign;

  public static async trackAction(args: { participantId: string, action: 'click' | 'view' | 'submission' }, context: any): Promise<Participant>  {
    if (!['click', 'view', 'submission'].includes(args.action)) throw new Error('invalid metric specified');
    const participant = await Participant.findOne({ where: { id: args.participantId }, relations: ['campaign'] });
    if (!participant) throw new Error('participant not found');
    if (!participant.campaign.isOpen()) throw new Error('campaign is closed');
    const campaign = await Campaign.findOne({ where: { id: participant.campaign.id }});
    if (!campaign) throw new Error('campaign not found');
    if (campaign.target !== constructHostUrl(context)) throw new Error('Host cannot manipulate campaigns');
    switch (args.action) {
      case 'click':
        participant.clickCount++;
        break;
      case 'view':
        participant.viewCount++;
        break;
      case 'submission':
        participant.submissionCount++;
        break;
      default:
        break;
    }
    const pointValue = campaign.algorithm.pointValues[args.action];
    campaign.totalParticipationScore = BigInt(campaign.totalParticipationScore) + BigInt(pointValue);
    participant.participationScore = BigInt(participant.participationScore) + BigInt(pointValue);
    await campaign.save();
    await participant.save();
    await Dragonchain.ledgerCampaignAction(args.action, participant.id, participant.campaign.id);
    return participant;
  };

  public  metrics() {
    return {
      clickCount: this.clickCount,
      viewCount: this.viewCount,
      submissionCount: this.submissionCount,
      participationScore: this.participationScore,
    }
  }

  public static newParticipant(user: User, campaign: Campaign): Participant {
    const participant = new Participant();
    participant.user = user;
    participant.campaign = campaign;
    return participant;
  }

  public static async get(args: { id: string }): Promise<Participant> {
    const { id } = args;
    const where: { [key: string]: string } = { id };
    const participant = await Participant.findOne({ where });
    if (!participant) throw new Error('participant not found');
    return participant;
  }
}
