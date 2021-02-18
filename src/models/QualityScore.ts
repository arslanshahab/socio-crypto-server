import {BaseEntity, Column, CreateDateColumn, Entity, PrimaryGeneratedColumn, UpdateDateColumn} from "typeorm";
import {BigNumberEntityTransformer} from "../util/transformers";
import {BigNumber} from "bignumber.js";
import { BN } from '../util/helpers';


@Entity()
export class QualityScore extends BaseEntity {
  @PrimaryGeneratedColumn('uuid')
  public id: string;

  @Column({ type: 'varchar', nullable: false, default: 0, transformer: BigNumberEntityTransformer })
  public clicks: BigNumber;

  @Column({ type: 'varchar', nullable: false, default: 0, transformer: BigNumberEntityTransformer })
  public views: BigNumber;

  @Column({ type: 'varchar', nullable: false, default: 0, transformer: BigNumberEntityTransformer })
  public submissions: BigNumber;

  @Column({type: 'varchar', nullable: false, default: 0, transformer: BigNumberEntityTransformer})
  public likes: BigNumber;

  @Column({type: 'varchar', nullable: false, default: 0, transformer: BigNumberEntityTransformer})
  public shares: BigNumber;

  @Column({type: 'varchar', nullable: false, default: 0, transformer: BigNumberEntityTransformer})
  public comments: BigNumber;

  @Column({nullable: false})
  public participantId: string;

  @CreateDateColumn()
  public createdAt: Date;

  @UpdateDateColumn()
  public updatedAt: Date;

  public static newQualityScore(participantId: string): QualityScore {
    const qualityScore = new QualityScore();
    qualityScore.participantId = participantId;
    qualityScore.clicks = new BN(0);
    qualityScore.views = new BN(0);
    qualityScore.submissions = new BN(0);
    qualityScore.likes = new BN(0);
    qualityScore.shares = new BN(0);
    qualityScore.comments = new BN(0);
    return qualityScore;
  }

}
