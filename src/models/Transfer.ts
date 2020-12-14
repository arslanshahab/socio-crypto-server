import BigNumber from 'bignumber.js';
import { PrimaryGeneratedColumn, Entity, BaseEntity, Column, CreateDateColumn, UpdateDateColumn, ManyToOne } from 'typeorm';
import { DateUtils } from 'typeorm/util/DateUtils';
import { Wallet } from './Wallet';
import { Campaign } from './Campaign';
import { BN } from '../util/helpers';
import {BigNumberEntityTransformer} from "../util/transformers";
import {PayoutStatus} from "../types";
import {Org} from "./Org";
import {FundingWallet} from './FundingWallet';
import { RafflePrize } from './RafflePrize';

@Entity()
export class Transfer extends BaseEntity {
  @PrimaryGeneratedColumn('uuid')
  public id: string;

  @Column({ type: 'varchar', nullable: false, transformer: BigNumberEntityTransformer })
  public amount: BigNumber;

  @Column({ type: 'varchar', nullable: true, transformer: BigNumberEntityTransformer })
  public usdAmount: BigNumber;

  @Column({ nullable: false })
  public action: 'transfer'|'withdraw'|'deposit'|'prize';

  @Column({ nullable: true })
  public withdrawStatus: 'pending'|'approved'|'rejected';

  @Column({nullable: true})
  public payoutStatus: PayoutStatus;

  @Column({nullable: true})
  public payoutId: string;

  @Column({nullable: true})
  public ethAddress: string;

  @Column({ nullable: true })
  public paypalAddress: string;

  @Column({nullable: true})
  public transactionHash: string;

  @CreateDateColumn()
  public createdAt: Date;

  @UpdateDateColumn()
  public updatedAt: Date;

  @ManyToOne(
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    _type => Wallet,
    wallet => wallet.transfers
  )
  public wallet: Wallet;

  @ManyToOne(
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    _type => FundingWallet,
    wallet => wallet.transfers
  )
  public fundingWallet: FundingWallet;

  @ManyToOne(
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    _type => Campaign,
    campaign => campaign.payouts
  )
  public campaign: Campaign;

  @ManyToOne(
    _type => Org,
    org => org.transfers
  )
  public org: Org;

  @ManyToOne(
    _type => RafflePrize,
    prize => prize.transfers
  )
  public rafflePrize: RafflePrize;

  public asV1() {
    return {...this, amount: parseFloat(this.amount.toString())};
  }

  public static async getTotalAnnualWithdrawalByWallet(wallet: Wallet): Promise<BigNumber> {
    const startOfYear = DateUtils.mixedDateToUtcDatetimeString(new Date(Date.UTC(new Date().getFullYear(), 0, 1)));
    const { sum } = await this.createQueryBuilder('transfer')
      .where(`transfer.action = 'withdraw' AND transfer."withdrawStatus" = 'approved' AND transfer."walletId" = :id AND transfer."updatedAt" >= '${startOfYear}' `, { id: wallet.id })
      .select('SUM(CAST(transfer.amount AS DECIMAL))')
      .getRawOne();
    return new BN(sum || 0);
  }

  public static async getTotalPendingByWallet(wallet: Wallet): Promise<BigNumber> {
    const { sum } = await this.createQueryBuilder('transfer')
      .where(`transfer.action = 'withdraw' AND transfer."withdrawStatus" = 'pending' AND transfer."walletId" = :id`, { id: wallet.id })
      .select('SUM(CAST(transfer.amount AS DECIMAL))')
      .getRawOne();
    return new BN(sum || 0);
  }

  public static async getWithdrawalsByStatus(status: string = 'pending'): Promise<Transfer[]> {
    return this.createQueryBuilder('transfer')
      .leftJoinAndSelect('transfer.wallet', 'wallet', 'wallet.id = transfer."walletId"')
      .leftJoinAndSelect('wallet.user', 'user', 'user.id = wallet."userId"')
      .leftJoinAndSelect('user.profile', 'profile', 'profile."userId" = user.id')
      .where(`transfer.action = 'withdraw' AND transfer."withdrawStatus" = :status`, { status })
      .orderBy('transfer."createdAt"', 'ASC')
      .getMany();
  }

  public static async getAuditedWithdrawals(): Promise<Transfer[]> {
    return this.createQueryBuilder('transfer')
      .leftJoinAndSelect('transfer.wallet', 'wallet', 'wallet.id = transfer."walletId"')
      .leftJoinAndSelect('wallet.user', 'user', 'user.id = wallet."userId"')
      .leftJoinAndSelect('user.profile', 'profile', 'profile."userId" = user.id')
      .where(`transfer.action = 'withdraw' AND transfer."withdrawStatus" = 'approved' OR transfer."withdrawStatus" = 'rejected'`)
      .orderBy('transfer."createdAt"', 'ASC')
      .getMany();
  }

  public static newFromCampaignPayout(wallet: Wallet, campaign: Campaign, amount: BigNumber): Transfer {
    const transfer = new Transfer();
    transfer.action = 'transfer';
    transfer.campaign = campaign;
    transfer.amount = amount;
    transfer.wallet = wallet;
    return transfer;
  }

  public static newFromWithdraw(wallet: Wallet, amount: BigNumber, ethAddress?: string, paypalAddress?: string): Transfer {
    const transfer = new Transfer();
    transfer.amount = amount;
    transfer.action = 'withdraw';
    transfer.wallet = wallet;
    transfer.withdrawStatus = 'pending';
    if (ethAddress) transfer.ethAddress = ethAddress;
    if (paypalAddress) transfer.paypalAddress = paypalAddress;
    return transfer;
  }

  public static newFromDeposit(wallet: FundingWallet, amount: BigNumber, ethAddress: string, transactionHash: string) {
    const transfer = new Transfer();
    transfer.amount = amount;
    transfer.action = 'deposit';
    transfer.ethAddress = ethAddress;
    transfer.transactionHash = transactionHash;
    transfer.fundingWallet = wallet as FundingWallet;
    return transfer;
  }

  public static newFromRaffleSelection(wallet: Wallet, campaign: Campaign, prize: RafflePrize) {
    const transfer = new Transfer();
    transfer.amount = new BN(0);
    transfer.action = 'prize';
    transfer.wallet = wallet;
    transfer.campaign = campaign;
    transfer.rafflePrize = prize;
    return transfer;
  }
}
