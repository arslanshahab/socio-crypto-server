import { PrimaryGeneratedColumn, Entity, BaseEntity, Column, OneToOne, JoinColumn } from 'typeorm';
import { User } from './User';

@Entity()
export class Wallet extends BaseEntity {
  @PrimaryGeneratedColumn('uuid')
  public id: string

  @Column({ type: 'float8', nullable: false, default: 0 })
  public balance: number;

  @OneToOne(
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    _type => User,
    user => user.wallet,
  )
  @JoinColumn()
  public user: User;
}