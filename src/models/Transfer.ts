import { PrimaryGeneratedColumn, Entity, BaseEntity, Column, CreateDateColumn, UpdateDateColumn, ManyToOne } from 'typeorm';
import { Wallet } from './Wallet';

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

  @Column({ nullable: true })
  public campaignId: string; 

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

  public static newFromCampaignPayout(wallet: Wallet, campaignId: string, amount: number): Transfer {
    const transfer = new Transfer();
    transfer.action = 'transfer';
    transfer.campaignId = campaignId;
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