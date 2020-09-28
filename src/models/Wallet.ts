import { PrimaryGeneratedColumn, Entity, BaseEntity, Column, OneToOne, JoinColumn, CreateDateColumn, UpdateDateColumn, OneToMany } from 'typeorm';
import BigNumber from 'bignumber.js';
import { BigNumberEntityTransformer } from '../util/transformers';
import { Transfer } from './Transfer';
import { User } from './User';

@Entity()
export class Wallet extends BaseEntity {
  @PrimaryGeneratedColumn('uuid')
  public id: string

  @Column({ type: 'varchar', nullable: false, default: 0, transformer: BigNumberEntityTransformer })
  public balance: BigNumber;

  @OneToOne(
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    _type => User,
    user => user.wallet,
  )
  @JoinColumn()
  public user: User;

  @CreateDateColumn()
  public createdAt: Date;

  @UpdateDateColumn()
  public updatedAt: Date;

  @OneToMany(
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    _type => Transfer,
    transfer => transfer.wallet,
    { eager: true }
  )
  public transfers: Transfer[];

  public async asV1(){
    return {
      ...this,
      balance: parseFloat(this.balance.toString()),
      pendingBalance: parseFloat(Transfer.getTotalPendingByWallet(this).toString()),
    }
  }
}
