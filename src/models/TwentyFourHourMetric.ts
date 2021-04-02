import {
  BaseEntity,
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  UpdateDateColumn
} from 'typeorm';
import { User } from './User';
import { BigNumberEntityTransformer } from '../util/transformers';
import BigNumber from 'bignumber.js';

@Entity()
export class TwentyFourHourMetric extends BaseEntity {
  @PrimaryGeneratedColumn('uuid')
  public id: string;

  @Column({  type: 'varchar', nullable: false, default: 0, transformer: BigNumberEntityTransformer })
  public score: BigNumber;

  @CreateDateColumn()
  public createdAt: Date;

  @UpdateDateColumn()
  public updatedAt: Date;

  @ManyToOne(
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    _type => User,
    user => user.twentyFourHourMetrics
  )
  public user: User;

  public asV1() {
    return {...this, score: parseFloat(this.score.toString())};
  }
}
