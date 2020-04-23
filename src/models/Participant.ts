import {BaseEntity, Entity, Column, ManyToOne, PrimaryGeneratedColumn} from 'typeorm';
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

  @Column({  type: 'bigint', nullable: false, default: 0 })
  public participationScore: bigint;

  @Column({ nullable: true })
  public link: string;

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
}
