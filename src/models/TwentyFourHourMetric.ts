import { BaseEntity, Entity, PrimaryColumn, Column, CreateDateColumn, ManyToOne } from 'typeorm';
import { User } from './User';

@Entity()
export class TwentyFourHourMetric extends BaseEntity {
  @PrimaryColumn('uuid')
  public id: string;

  @Column({  type: 'bigint', nullable: false, default: 0 })
  public score: bigint;

  @CreateDateColumn()
  public createdAt: Date;

  @ManyToOne(
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    _type => User,
    user => user.twentyFourHourMetrics
  )
  public user: User;
}