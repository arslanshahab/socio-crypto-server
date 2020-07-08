import { BaseEntity, Entity, Column, OneToMany, PrimaryGeneratedColumn, CreateDateColumn, UpdateDateColumn } from 'typeorm';
import { DateUtils } from 'typeorm/util/DateUtils';
import { Participant } from './Participant';
import {AlgorithmSpecs} from '../types';
import { Validator } from '../schemas';
import {SocialPost} from "./SocialPost";
import {Transfer} from './Transfer';
import { StringifiedArrayTransformer, BigNumberEntityTransformer } from '../util/transformers';
import { BigNumber } from 'bignumber.js';
import { BN } from 'src/util/helpers';

@Entity()
export class Campaign extends BaseEntity {
  public static validate = new Validator();
  @PrimaryGeneratedColumn('uuid')
  public id: string;

  @Column({ nullable: false })
  public name: string;

  @Column({ type: 'timestamptz', nullable: false })
  public beginDate: Date;

  @Column({ type: 'timestamptz', nullable: false })
  public endDate: Date;

  @Column({ type: 'varchar', transformer: BigNumberEntityTransformer })
  public coiinTotal: BigNumber;

  @Column({ type: 'varchar', nullable: false, default: 0, transformer: BigNumberEntityTransformer })
  public totalParticipationScore: BigNumber;

  @Column()
  public target: string;

  @Column({ default: "", nullable: true })
  public description: string;

  @Column({ nullable: false, default: 'raiinmaker' })
  public company: string;

  @Column({ nullable: true })
  public tagline: string;

  @Column({type: "jsonb", nullable: false })
  public algorithm: AlgorithmSpecs;

  @Column({ nullable: false, default: false })
  public audited: boolean;

  @Column({ nullable: true })
  public targetVideo: string;

  @Column({ nullable: true })
  public imagePath: string;

  @Column({ type: 'text', nullable: false, default: '[]', transformer: StringifiedArrayTransformer })
  public suggestedPosts: string[];

  @Column({ type: 'text', nullable: false, default: '[]', transformer: StringifiedArrayTransformer })
  public suggestedTags: string[];

  @OneToMany(
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    _type => Participant,
    participant => participant.campaign,
  )
  public participants: Participant[];

  @OneToMany(
      _type => SocialPost,
      post => post.campaign
  )
  public posts: SocialPost[];

  @OneToMany(
    _type => Transfer,
    transfer => transfer.campaign
  )
  public payouts: Transfer[];

  @CreateDateColumn()
  public createdAt: Date;

  @UpdateDateColumn()
  public updatedAt: Date;

  isOpen() {
    const now = new Date();
    if (new Date(this.beginDate).getTime() <= now.getTime() && new Date(this.endDate).getTime() >= now.getTime()) return true;
    return false;
  }

  public asV1() {
    const returnedCampaign: Campaign = {...this, totalParticipationScore: parseFloat(this.totalParticipationScore.toString())};
    if (this.participants && this.participants.length > 0) returnedCampaign.participants = this.participants.map((participant) => participant.asV1());
    if (this.payouts && this.payouts.length > 0) returnedCampaign.payouts = this.payouts.map((payout) => payout.asV1());
    return returnedCampaign;
  }

  public static async findCampaignsByStatus(open: boolean, skip: number, take: number, company: string) {
    let where = '';
    const now = DateUtils.mixedDateToDatetimeString(new Date());
    if (open !== null && open === true) {
      where = `("beginDate" <= '${now}' AND "endDate" >= '${now}')`;
    } else if (open !== null && open === false) {
      where = `("beginDate" >= '${now}' OR "endDate" <= '${now}')`;
    }
    let query = this.createQueryBuilder('campaign')
      .where(where);
    if (company) query = query.andWhere(`"company"=:company`, { company })
    return await query
      .leftJoinAndSelect('campaign.participants', 'participant', 'participant."campaignId" = campaign.id')
      .leftJoinAndSelect('participant.user', 'user', 'user.id = participant."userId"')
      .skip(skip)
      .take(take)
      .getManyAndCount();
  }

  public static async findCampaignById(id: string, company: string) {
    let query = this.createQueryBuilder('campaign');
    return query
        .leftJoinAndSelect('campaign.participants', 'participant', 'participant."campaignId" = campaign.id')
        .leftJoinAndSelect('participant.user', 'user', 'user.id = participant."userId"')
        .leftJoinAndSelect('user.wallet', 'wallet', 'wallet."userId" = user.id')
        .where('campaign.company = :company AND campaign.id = :id', { company, id })
        .getOne()
  }

  public static newCampaign(name: string, targetVideo: string, beginDate: string, endDate: string, coiinTotal: string, target: string, description: string, company: string, algorithm: string, tagline: string, suggestedPosts: string[], suggestedTags: string[]): Campaign {
    const campaign = new Campaign();
    campaign.name = name;
    campaign.coiinTotal = new BN(coiinTotal);
    campaign.target = target;
    campaign.company = company;
    campaign.beginDate = new Date(beginDate);
    campaign.endDate = new Date(endDate);
    campaign.algorithm = JSON.parse(algorithm);
    campaign.targetVideo = targetVideo;
    if (description) campaign.description = description;
    if (tagline) campaign.tagline = tagline;
    if (suggestedPosts) campaign.suggestedPosts = suggestedPosts;
    if (suggestedTags) campaign.suggestedTags = suggestedTags;
    return campaign;
  }
}
