import { BaseEntity, Entity, PrimaryGeneratedColumn, Column, OneToMany, OneToOne, CreateDateColumn, UpdateDateColumn } from 'typeorm';
import { Participant } from './Participant';
import { Wallet } from './Wallet';
import { SocialLink } from './SocialLink';
import {SocialPost} from "./SocialPost";
import { FactorLink } from './FactorLink';
import { TwentyFourHourMetric } from './TwentyFourHourMetric';
import BigNumber from 'bignumber.js';
import { BN } from '../util/helpers';
import { FieldNode } from 'graphql';

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
    if (this.posts && this.posts.length > 0) {
      returnedUser.posts = this.posts.map(post => post.asV1());
    }
    if (this.twentyFourHourMetrics && this.twentyFourHourMetrics.length > 0) {
      returnedUser.twentyFourHourMetrics = this.twentyFourHourMetrics.map(metric => metric.asV1());
    }
    if (this.wallet) {
      returnedUser.wallet = this.wallet.asV1();
      if (this.wallet.transfers && this.wallet.transfers.length > 0) {
        returnedUser.wallet.transfers = returnedUser.wallet.transfers.map((transfer) => transfer.asV1());
      }
    }
    if (this.campaigns && this.campaigns.length > 0) {
      returnedUser.campaigns = this.campaigns.map(participant => participant.asV1());
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

  public static async getUser(id: string, graphqlQuery: FieldNode|undefined): Promise<User|undefined> {
    let query = this.createQueryBuilder('user');
    if (graphqlQuery) {
      const fieldNodes = graphqlQuery.selectionSet?.selections.filter(node => node.kind === 'Field') || [];
      const loadCampaigns = fieldNodes.find((node: FieldNode) => node.name.value === 'campaigns') as FieldNode;
      const loadSocialLinks = fieldNodes.find((node: FieldNode) => node.name.value === 'socialLinks') as FieldNode;
      const loadPosts = fieldNodes.find((node: FieldNode) => node.name.value === 'posts') as FieldNode;
      const loadTwentyFourHourMetrics = fieldNodes.find((node: FieldNode) => node.name.value === 'twentyFourHourMetrics') as FieldNode;
      const loadWallet = fieldNodes.find((node: FieldNode) => node.name.value === 'wallet') as FieldNode;
      const loadFactorLinks = fieldNodes.find((node: FieldNode) => node.name.value === 'factorLinks') as FieldNode;
      if (loadCampaigns) {
        query = query.leftJoinAndSelect('user.campaigns', 'participant', 'participant."userId" = user.id');
        const subFields = loadCampaigns.selectionSet?.selections.filter(node => node.kind === 'Field') || [];
        if (subFields.find((node: FieldNode) => node.name.value === 'campaign')) {
          query = query.leftJoinAndSelect('participant.campaign', 'campaign', 'participant."campaignId" = campaign.id');
        }
      }
      if (loadWallet) {
        query = query.leftJoinAndSelect('user.wallet', 'wallet', 'wallet."userId" = user.id');
        const subFields = loadWallet.selectionSet?.selections.filter(node => node.kind === 'Field') || [];
        if (subFields.find((node: FieldNode) => node.name.value === 'transfers')) {
          query = query.leftJoinAndSelect('wallet.transfers', 'transfer', 'transfer."walletId" = wallet.id');
        }
      }
      if (loadSocialLinks) query = query.leftJoinAndSelect('user.socialLinks', 'social', 'social."userId" = user.id')
      if (loadPosts) query = query.leftJoinAndSelect('user.posts', 'post', 'post."userId" = user.id');
      if (loadTwentyFourHourMetrics) query = query.leftJoinAndSelect('user.twentyFourHourMetrics', 'metric', 'metric."userId" = user.id')
      if (loadFactorLinks) query = query.leftJoinAndSelect('user.factorLinks', 'factor', 'factor."userId" = user.id');
    }
    query = query.where('user.identityId = :id', { id });
    return query.getOne();
  }
}

