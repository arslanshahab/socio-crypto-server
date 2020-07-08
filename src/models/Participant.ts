import {BaseEntity, Entity, Column, ManyToOne, PrimaryGeneratedColumn, CreateDateColumn, UpdateDateColumn} from 'typeorm';
import { Campaign } from './Campaign';
import { User } from './User';
import { BigNumber } from 'bignumber.js';
import { StringifiedArrayTransformer } from '../util/transformers';

@Entity()
export class Participant extends BaseEntity {
  @PrimaryGeneratedColumn('uuid')
  public id: string;

  @Column({ type: 'varchar', nullable: false, default: 0, transformer: StringifiedArrayTransformer })
  public clickCount: BigNumber;

  @Column({ type: 'varchar', nullable: false, default: 0, transformer: StringifiedArrayTransformer })
  public viewCount: BigNumber;

  @Column({ type: 'varchar', nullable: false, default: 0, transformer: StringifiedArrayTransformer })
  public submissionCount: BigNumber;

  @Column({  type: 'varchar', nullable: false, default: 0, transformer: StringifiedArrayTransformer })
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
      participationScore: parseFloat(this.participationScore.toString()),
    }
  }

  public asV1() {
    return {...this, participationScore: parseFloat(this.participationScore.toString())}
  }

  public static newParticipant(user: User, campaign: Campaign): Participant {
    const participant = new Participant();
    participant.user = user;
    participant.campaign = campaign;
    return participant;
  }
}
