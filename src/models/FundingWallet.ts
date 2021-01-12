import { PrimaryGeneratedColumn, Entity, BaseEntity, Column, OneToOne, JoinColumn, CreateDateColumn, UpdateDateColumn, OneToMany } from 'typeorm';
import BigNumber from 'bignumber.js';
import { BigNumberEntityTransformer } from '../util/transformers';
import { Transfer } from './Transfer';
import { ExternalAddress } from './ExternalAddress';
import { Org } from './Org';
import {Escrow} from "./Escrow";

@Entity()
export class FundingWallet extends BaseEntity {
  @PrimaryGeneratedColumn('uuid')
  public id: string

  @Column({ type: 'varchar', nullable: false, default: 0, transformer: BigNumberEntityTransformer })
  public balance: BigNumber;

  @OneToOne(
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    _type => Org,
    org => org.fundingWallet,
  )
  @JoinColumn()
  public org: Org;

  @CreateDateColumn()
  public createdAt: Date;

  @UpdateDateColumn()
  public updatedAt: Date;

  @OneToMany(
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    _type => Transfer,
    transfer => transfer.fundingWallet,
    { eager: true }
  )
  public transfers: Transfer[];

  @OneToMany(
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    _type => ExternalAddress,
    address => address.fundingWallet
  )
  public addresses: ExternalAddress[];

  @OneToMany(
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    _type => Escrow,
    escrow => escrow.fundingWallet
  )
  public escrows: Escrow[];

  public asV1(pendingBalance?: string){
    return {
      ...this,
      balance: parseFloat(this.balance.toString()),
      pendingBalance: pendingBalance,
      transfers: this.transfers.map(transfer => transfer.asV1())
    }
  }
}
