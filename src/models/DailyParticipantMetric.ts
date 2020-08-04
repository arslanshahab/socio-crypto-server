import { BaseEntity, Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, ManyToOne, MoreThan } from 'typeorm';
import { BigNumber } from 'bignumber.js';
import { BigNumberEntityTransformer } from '../util/transformers';
import { User } from './User';
import { Campaign } from './Campaign';
import { BN } from '../util/helpers';
import { Participant } from './Participant';

@Entity()
export class DailyParticipantMetric extends BaseEntity {
  @PrimaryGeneratedColumn('uuid')
  public id: string;

  @Column({type: 'varchar', nullable: false, default: 0, transformer: BigNumberEntityTransformer})
  public clickCount: BigNumber;

  @Column({type: 'varchar', nullable: false, default: 0, transformer: BigNumberEntityTransformer})
  public viewCount: BigNumber;

  @Column({type: 'varchar', nullable: false, default: 0, transformer: BigNumberEntityTransformer})
  public submissionCount: BigNumber;

  @Column({type: 'varchar', nullable: false, default: 0, transformer: BigNumberEntityTransformer})
  public likeCount: BigNumber;

  @Column({type: 'varchar', nullable: false, default: 0, transformer: BigNumberEntityTransformer})
  public shareCount: BigNumber;

  @Column({type: 'varchar', nullable: false, default: 0, transformer: BigNumberEntityTransformer})
  public commentCount: BigNumber;

  @Column({type: 'varchar', nullable: false, default: 0, transformer: BigNumberEntityTransformer})
  public participationScore: BigNumber;

  @Column({type: 'varchar', nullable: false, default: 0, transformer: BigNumberEntityTransformer})
  public totalParticipationScore: BigNumber;

  @Column({nullable: false})
  public participantId: string;

  @CreateDateColumn()
  public createdAt: Date;

  @UpdateDateColumn()
  public updatedAt: Date;

  @ManyToOne(
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    _type => User,
    user => user.dailyMetrics
  )
  public user: User;

  @ManyToOne(
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    _type => Campaign,
    campaign => campaign.dailyMetrics
  )
  public campaign: Campaign;

  public asV1() {
    return {
      ...this,
      clickCount: this.clickCount.toNumber(),
      viewCount: this.viewCount.toNumber(),
      submissionCount: this.submissionCount.toNumber(),
      likeCount: this.likeCount.toNumber(),
      shareCount: this.shareCount.toNumber(),
      commentCount: this.commentCount.toNumber(),
      participationScore: parseFloat(this.participationScore.toString()),
    }
  }

  public static async upsert(
    user: User,
    campaign: Campaign,
    participant: Participant,
    action: 'click'|'view'|'submission'|'like'|'share'|'comment',
    additiveParticipationScore: BigNumber,
    actionCount: number = 1
  ) {
    if (!['click','view','submission','like','share','comment'].includes(action)) throw new Error('action not supported');
    const currentDate = new Date();
    const month = (currentDate.getUTCMonth() + 1) < 10 ? `0${currentDate.getUTCMonth() + 1}` : currentDate.getUTCMonth() + 1;
    const day = currentDate.getUTCDate() < 10 ? `0${currentDate.getUTCDate()}` : currentDate.getUTCDate();
    const yyymmdd = `${currentDate.getUTCFullYear()}-${month}-${day}`;
    let record = await DailyParticipantMetric.findOne({ where: { participantId: participant.id, createdAt: MoreThan(`${yyymmdd} 00:00:00`) } });
    if (!record) {
      record = new DailyParticipantMetric();
      record.participantId = participant.id;
      record.user = user;
      record.campaign = campaign;
    }
    record.totalParticipationScore = participant.participationScore;
    switch (action) {
      case 'click':
        record.clickCount = (record.clickCount) ? record.clickCount.plus(new BN(record.clickCount)) : new BN(actionCount);
        break;
      case 'view':
        record.viewCount = (record.viewCount) ? record.viewCount.plus(new BN(record.viewCount)) : new BN(actionCount);
        break;
      case 'submission':
        record.submissionCount = (record.submissionCount) ? record.submissionCount.plus(new BN(record.submissionCount)) : new BN(actionCount);
        break;
      case 'like':
        record.likeCount = (record.likeCount) ? record.likeCount.plus(new BN(record.likeCount)) : new BN(actionCount);
        break;
      case 'share':
        record.shareCount = (record.shareCount) ? record.shareCount.plus(new BN(record.shareCount)) : new BN(actionCount);
        break;
      case 'comment':
        record.commentCount = (record.commentCount) ? record.commentCount.plus(new BN(record.commentCount)) : new BN(actionCount);
        break;
    }
    record.participationScore = (record.participationScore) ? record.participationScore.plus(additiveParticipationScore) : new BN(additiveParticipationScore);
    await record.save();
    return record;
  }

  public static async getSortedByParticipantId(participantId: string): Promise<DailyParticipantMetric[]> {
    return this.createQueryBuilder('metrics')
      .where('metrics."participantId" = :id', {id: participantId})
      .orderBy('metrics."createdAt"', 'ASC')
      .getMany();
  }

  public static async getSortedByUser(user: User, today: boolean): Promise<DailyParticipantMetric[]> {
    let where: {[key: string]:  any} = { user }; 
    if (today) {
      const currentDate = new Date();
      const month = (currentDate.getUTCMonth() + 1) < 10 ? `0${currentDate.getUTCMonth() + 1}` : currentDate.getUTCMonth() + 1;
      const day = currentDate.getUTCDate() < 10 ? `0${currentDate.getUTCDate()}` : currentDate.getUTCDate();
      const yyymmdd = `${currentDate.getUTCFullYear()}-${month}-${day}`;
      where['createdAt'] = MoreThan(`${yyymmdd} 00:00:00`);
    }
    return await DailyParticipantMetric.find({ where, order: { createdAt: 'ASC' } });
  }
}