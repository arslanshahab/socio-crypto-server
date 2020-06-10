import { BaseEntity, Entity, PrimaryColumn, Column, OneToMany, OneToOne } from 'typeorm';
import { DateUtils } from 'typeorm/util/DateUtils';
import { Participant } from './Participant';
import { Wallet } from './Wallet';
import { SocialLink } from './SocialLink';
import {SocialPost} from "./SocialPost";
import { FactorLink } from './FactorLink';
import { TwentyFourHourMetric } from './TwentyFourHourMetric';

@Entity()
export class User extends BaseEntity {
  @PrimaryColumn()
  public id: string;

  @Column({ nullable: true })
  public email: string;

  @Column({ nullable: false, unique: true })
  public username: string;

  @Column({ nullable: true })
  public deviceToken: string;

  @Column({default: true})
  public active: boolean;

  @OneToMany(
      _type => SocialPost,
      posts => posts.user
  )
  posts: SocialPost[];

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

  public static async getUserTotalParticipationScore(userId: String): Promise<BigInt> {
    const { sum } = await this.createQueryBuilder('user')
      .leftJoin('user.campaigns', 'campaign')
      .where('user.id = :userId AND campaign."userId" = user.id', { userId })
      .select('SUM(CAST(campaign."participationScore" as double precision))')
      .getRawOne();
    return (sum && BigInt(sum)) || BigInt(0);
  }

  public static async getUserWithOptions(id: string, openCampaigns?: boolean): Promise<User|undefined> {
    let where = '';
    const now = DateUtils.mixedDateToDatetimeString(new Date());
    if (openCampaigns !== null && openCampaigns === true) {
      where = `(campaign."beginDate" <= '${now}' AND campaign."endDate" >= '${now}')`;
    } else if (openCampaigns !== null && openCampaigns === false) {
      where = `(campaign."beginDate" >= '${now}' OR campaign."endDate" <= '${now}')`;
    }
    let query = this.createQueryBuilder('user')
      .leftJoinAndSelect('user.campaigns', 'participant', 'participant."userId" = user.id')
      .leftJoinAndSelect('participant.campaign', 'campaign', 'participant."campaignId" = campaign.id')
      .leftJoinAndSelect('user.wallet', 'wallet', 'wallet."userId" = user.id')
      .leftJoinAndSelect('user.socialLinks', 'social', 'social."userId" = user.id')
      .leftJoinAndSelect('user.factorLinks', 'factor', 'factor."userId" = user.id')
      .leftJoinAndSelect('user.posts', 'post', 'post."userId" = user.id')
      .leftJoinAndSelect('user.twentyFourHourMetrics', 'metric', 'metric."userId" = user.id')
      .where('user.id = :id', { id });
    if (where !== '') query = query.andWhere(where);
    return query.getOne();
  }
}
