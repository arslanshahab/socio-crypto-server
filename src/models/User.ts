import { BaseEntity, Entity, PrimaryGeneratedColumn, Column, OneToMany, OneToOne, CreateDateColumn, UpdateDateColumn } from 'typeorm';
import { Participant } from './Participant';
import { Wallet } from './Wallet';
import { SocialLink } from './SocialLink';
import {SocialPost} from "./SocialPost";
import { FactorLink } from './FactorLink';
import { TwentyFourHourMetric } from './TwentyFourHourMetric';
import BigNumber from 'bignumber.js';
import { BN } from '../util/helpers';

@Entity()
export class User extends BaseEntity {
  @PrimaryGeneratedColumn('uuid')
  public id: string;

  @Column({ nullable: false })
  public identityId: string;

  @Column({ nullable: true })
  public email: string;

  @Column({ nullable: false, unique: true })
  public username: string;

  @Column({ nullable: true })
  public deviceToken: string;

  @Column({ nullable: true })
  public recoveryCode: string;

  @Column({default: true})
  public active: boolean;

  @Column({ nullable: true })
  public kycStatus: string;

  @OneToMany(
      _type => SocialPost,
      posts => posts.user
  )
  posts: SocialPost[];

  @CreateDateColumn()
  public createdAt: Date;

  @UpdateDateColumn()
  public updatedAt: Date;

  @OneToMany(
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    _type => Participant,
    participant => participant.user,
  )
  campaigns: Participant[];

  @OneToOne(
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    _type => Wallet,
    wallet => wallet.user,
  )
  public wallet: Wallet;

  @OneToMany(
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    _type => SocialLink,
    link => link.user,
  )
  public socialLinks: SocialLink[];

  @OneToMany(
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    _type => FactorLink,
    link => link.user,
  )
  public factorLinks: FactorLink[];

  @OneToMany(
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    _type => TwentyFourHourMetric,
    metrics => metrics.user
  )
  public twentyFourHourMetrics: TwentyFourHourMetric[];

  public asV1() {
    const returnedUser: User = {...this, hasRecoveryCodeSet: this.recoveryCode !== null && this.recoveryCode !== ""};
    if (this.wallet) {
      returnedUser.wallet = this.wallet.asV1();
      if (this.wallet.transfers && this.wallet.transfers.length > 0) {
        returnedUser.wallet.transfers = returnedUser.wallet.transfers.map((transfer) => transfer.asV1());
      }
    }
    return returnedUser;
  }

  public static async getUserTotalParticipationScore(userId: String): Promise<BigNumber> {
    const { sum } = await this.createQueryBuilder('user')
      .leftJoin('user.campaigns', 'campaign')
      .where('user.id = :userId AND campaign."userId" = user.id', { userId })
      .select('SUM(CAST(campaign."participationScore" as double precision))')
      .getRawOne();
    return new BN(sum || 0);
  }

  public static async getUser(id: string): Promise<User|undefined> {
    return this.createQueryBuilder('user')
      .leftJoinAndSelect('user.campaigns', 'participant', 'participant."userId" = user.id')
      .leftJoinAndSelect('participant.campaign', 'campaign', 'participant."campaignId" = campaign.id')
      .leftJoinAndSelect('campaign.participants', 'part', 'part."campaignId" = campaign.id')
      .leftJoinAndSelect('part.user', 'u')
      .leftJoinAndSelect('user.wallet', 'wallet', 'wallet."userId" = user.id')
      .leftJoinAndSelect('wallet.transfers', 'transfer', 'transfer."walletId" = wallet.id')
      .leftJoinAndSelect('transfer.campaign', 'c', 'c.id = transfer."campaignId"')
      .leftJoinAndSelect('user.socialLinks', 'social', 'social."userId" = user.id')
      .leftJoinAndSelect('user.factorLinks', 'factor', 'factor."userId" = user.id')
      .leftJoinAndSelect('user.posts', 'post', 'post."userId" = user.id')
      .leftJoinAndSelect('user.twentyFourHourMetrics', 'metric', 'metric."userId" = user.id')
      .where('user.identityId = :id', { id })
      .getOne();
  }
}

