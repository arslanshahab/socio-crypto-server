import { PrimaryGeneratedColumn, Entity, BaseEntity, Column, CreateDateColumn, UpdateDateColumn, ManyToOne } from 'typeorm';
import { Wallet } from './Wallet';
import { Campaign } from './Campaign';

@Entity()
export class Transfer extends BaseEntity {
  @PrimaryGeneratedColumn('uuid')
  public id: string;

  @Column({ type: 'float8', nullable: false })
  public amount: number;

  @Column({ nullable: false })
  public action: 'transfer'|'withdraw';

  @Column({ nullable: true })
  public withdrawStatus: 'pending'|'approved'|'rejected';

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
    _type => Campaign,
    campaign => campaign.payouts
  )
  public campaign: Campaign;

  public static async getTotalPendingByWallet(wallet: Wallet): Promise<number> {
    const { sum } = await this.createQueryBuilder('transfer')
      .where(`transfer.action = 'withdraw' AND transfer."withdrawStatus" = 'pending' AND transfer."walletId" = :id`, { id: wallet.id })
      .select('SUM(transfer.amount)')
      .getRawOne();
    return sum || 0;
  }

  public static async getPendingWithdrawals(): Promise<Transfer[]> {
    return this.createQueryBuilder('transfer')
      .leftJoinAndSelect('transfer.wallet', 'wallet', 'wallet.id = transfer."walletId"')
      .leftJoinAndSelect('wallet.user', 'user', 'user.id = wallet."userId"')
      .where(`transfer.action = 'withdraw' AND transfer."withdrawStatus" = 'pending'`)
      .orderBy('transfer."createdAt"', 'ASC')
      .getMany();
  }

  public static newFromCampaignPayout(wallet: Wallet, campaign: Campaign, amount: number): Transfer {
    const transfer = new Transfer();
    transfer.action = 'transfer';
    transfer.campaign = campaign;
    transfer.amount = amount;
    transfer.wallet = wallet;
    return transfer;
  }

  public static newFromWithdraw(wallet: Wallet, amount: number): Transfer {
    const transfer = new Transfer();
    transfer.amount = amount;
    transfer.action = 'withdraw';
    transfer.wallet = wallet;
    transfer.withdrawStatus = 'pending';
    return transfer;
  }
}