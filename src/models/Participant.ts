import {
  BaseEntity,
  Entity,
  Column,
  ManyToOne,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Campaign } from './Campaign';
import { User } from './User';
import { BigNumber } from 'bignumber.js';
import { BigNumberEntityTransformer } from '../util/transformers';
import { BN } from '../util/helpers';
import { encrypt } from '../util/crypto';

@Entity()
export class Participant extends BaseEntity {
  @PrimaryGeneratedColumn('uuid')
  public id: string;

  @Column({ type: 'varchar', nullable: false, default: 0, transformer: BigNumberEntityTransformer })
  public clickCount: BigNumber;

  @Column({ type: 'varchar', nullable: false, default: 0, transformer: BigNumberEntityTransformer })
  public viewCount: BigNumber;

  @Column({ type: 'varchar', nullable: false, default: 0, transformer: BigNumberEntityTransformer })
  public submissionCount: BigNumber;

  @Column({  type: 'varchar', nullable: false, default: 0, transformer: BigNumberEntityTransformer })
  public participationScore: BigNumber;

  @Column({ nullable: true })
  public link: string;

  @Column({ nullable: true })
  public email: string;

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
      clickCount: parseFloat(this.clickCount.toString()),
      viewCount: parseFloat(this.viewCount.toString()),
      submissionCount: parseFloat(this.submissionCount.toString()),
      participationScore: parseFloat(this.participationScore.toString()),
    }
  }

  public asV1() {
    const returnedValue: Participant = {
      ...this,
      metrics: this.metrics(),
      clickCount: parseFloat(this.clickCount.toString()),
      viewCount: parseFloat(this.viewCount.toString()),
      submissionCount: parseFloat(this.submissionCount.toString()),
      participationScore: parseFloat(this.participationScore.toString())
    };
    if (this.campaign) returnedValue.campaign = this.campaign.asV1();
    if (this.user) returnedValue.user = this.user.asV1();
    return returnedValue;
  }

  public static newParticipant(user: User, campaign: Campaign, email?: string): Participant {
    const participant = new Participant();
    participant.clickCount = new BN(0)
    participant.viewCount = new BN(0)
    participant.submissionCount = new BN(0)
    participant.participationScore = new BN(0)
    participant.user = user;
    participant.campaign = campaign;
    if (email) participant.email = encrypt(email);
    return participant;
  }
}
