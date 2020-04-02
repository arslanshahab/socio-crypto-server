import { BaseEntity, Entity, Column, ManyToOne, PrimaryGeneratedColumn, getConnection } from 'typeorm';
import { Campaign } from './Campaign';
import { User } from './User';

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

  public static async trackAction(args: {participantId: string, action: string }): Promise<Participant | undefined>  {
    if (!['click', 'view', 'submission'].includes(args.action)) throw new Error('invalid metric specified');
    let payload: Participant;
    await getConnection().transaction(async manager => {
      const participant = await manager.findOne(Participant, { where: { id: args.participantId }, relations: ['campaign'], lock: { mode: 'pessimistic_write' }, });
      if (!participant) throw new Error('participant not found');
      if (!participant.campaign.isOpen()) throw new Error('campaign is closed');
      // Pending Algorithm branch merged in
      // const campaign = await Campaign.findOne({ where: { id: participant.campaign.id }, lock: { mode: 'pessimistic_write'} });
      // if (!campaign) throw new Error('campaign not found');
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
      // Pending Algorithm branch merged in
      // const pointValue = campaign.algorithm.pointValues[args.action];
      // campaign.totalParticipationScore += pointValue;
      // await campaign.save();
      await manager.save(participant);
      payload = participant
    });

    // @ts-ignore
    return payload;
  }

  public  metrics() {
    return {
      clickCount: this.clickCount,
      viewCount: this.viewCount,
      submissionCount: this.submissionCount,
    }
  }

  public static newParticipant(user: User, campaign: Campaign): Participant {
    const participant = new Participant();
    participant.user = user;
    participant.campaign = campaign;
    return participant;
  }
}