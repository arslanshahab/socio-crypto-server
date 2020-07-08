import {BaseEntity, Entity, Column, ManyToOne, PrimaryGeneratedColumn, CreateDateColumn, UpdateDateColumn} from 'typeorm';
import { Campaign } from './Campaign';
import { User } from './User';
import { BigNumber } from 'bignumber.js';

@Entity()
export class Participant extends BaseEntity {
  @PrimaryGeneratedColumn('uuid')
  public id: string;

  @Column({ type: 'varchar', nullable: false, default: 0 })
  public clickCount: BigNumber;

  @Column({ type: 'varchar', nullable: false, default: 0 })
  public viewCount: BigNumber;

  @Column({ type: 'varchar', nullable: false, default: 0 })
  public submissionCount: BigNumber;

  @Column({  type: 'varchar', nullable: false, default: 0 })
  public participationScore: BigNumber;

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

  @CreateDateColumn()
  public createdAt: Date;

  @UpdateDateColumn()
  public updatedAt: Date;

  public metrics() {
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
