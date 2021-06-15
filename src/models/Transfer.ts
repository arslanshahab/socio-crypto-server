import BigNumber from "bignumber.js";
import {
    PrimaryGeneratedColumn,
    Entity,
    BaseEntity,
    Column,
    CreateDateColumn,
    UpdateDateColumn,
    ManyToOne,
} from "typeorm";
import { DateUtils } from "typeorm/util/DateUtils";
import { Wallet } from "./Wallet";
import { Campaign } from "./Campaign";
import { BN } from "../util/helpers";
import { BigNumberEntityTransformer } from "../util/transformers";
import { TransferStatus } from "../types";
import { Org } from "./Org";
import { RafflePrize } from "./RafflePrize";
import { performCurrencyTransfer } from "../controllers/helpers";

@Entity()
export class Transfer extends BaseEntity {
    @PrimaryGeneratedColumn("uuid")
    public id: string;

    @Column({ type: "varchar", nullable: false, transformer: BigNumberEntityTransformer })
    public amount: BigNumber;

    // TODO: We should get rid of this column. Having amount and currency seems to be a better way to go.
    @Column({ type: "varchar", nullable: true, transformer: BigNumberEntityTransformer })
    public usdAmount: BigNumber;

    @Column({ type: "varchar", nullable: true })
    public currency: string;

    @Column({ nullable: false })
    public action: "transfer" | "withdraw" | "deposit" | "prize" | "refund" | "fee";

    @Column({ nullable: true })
    public status: TransferStatus;

    // TODO: We should get rid of this column as well. It seems pretty redundant, and considering payouts aren't a thing yet this should be doable.
    @Column({ nullable: true })
    public payoutStatus: TransferStatus;

    @Column({ nullable: true })
    public payoutId: string;

    @Column({ nullable: true })
    public stripeCardId: string;

    @Column({ nullable: true })
    public ethAddress: string;

    @Column({ nullable: true })
    public paypalAddress: string;

    @Column({ nullable: true })
    public transactionHash: string;

    @CreateDateColumn()
    public createdAt: Date;

    @UpdateDateColumn()
    public updatedAt: Date;

    @ManyToOne(
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        (_type) => Wallet,
        (wallet) => wallet.transfers
    )
    public wallet: Wallet;

    @ManyToOne(
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        (_type) => Campaign,
        (campaign) => campaign.payouts
    )
    public campaign: Campaign;

    @ManyToOne((_type) => Org, (org) => org.transfers)
    public org: Org;

    @ManyToOne((_type) => RafflePrize, (prize) => prize.transfers)
    public rafflePrize: RafflePrize;

    public asV1() {
        const response: any = { ...this, amount: parseFloat(this.amount.toString()) };
        if (this.usdAmount) response.usdAmount = parseFloat(this.usdAmount.toString());
        return response;
    }

    public static async getTotalAnnualWithdrawalByWallet(wallet: Wallet): Promise<BigNumber> {
        const startOfYear = DateUtils.mixedDateToUtcDatetimeString(new Date(Date.UTC(new Date().getFullYear(), 0, 1)));
        const { sum } = await this.createQueryBuilder("transfer")
            .where(
                `transfer.action = 'withdraw' AND transfer."status" = 'APPROVED' AND transfer."walletId" = :id AND transfer."updatedAt" >= '${startOfYear}' `,
                { id: wallet.id }
            )
            .select('SUM(CAST(transfer."usdAmount" AS DECIMAL))')
            .getRawOne();
        return new BN(sum || 0);
    }

    public static async getTotalPendingByWallet(
        wallet: Wallet,
        currency: string,
        usd: boolean = false
    ): Promise<BigNumber> {
        let query = await this.createQueryBuilder("transfer").where(
            `transfer.action = 'withdraw' AND transfer."status" = 'PENDING' AND transfer."walletId" = :id AND transfer."currency" = :currency`,
            { id: wallet.id, currency }
        );
        if (usd) query = query.select('SUM(CAST(transfer."usdAmount" AS DECIMAL))');
        else query = query.select('SUM(CAST(transfer."amount" AS DECIMAL))');
        const { sum } = await query.getRawOne();
        return new BN(sum || 0);
    }

    public static async getTotalPendingByCurrencyInUsd(wallet: Wallet): Promise<any> {
        const groupedSums = await this.createQueryBuilder("transfer")
            .where(`transfer.action = 'withdraw' AND transfer."status" = 'PENDING' AND transfer."walletId" = :id`, {
                id: wallet.id,
            })
            .groupBy("transfer.currency")
            .select(
                'transfer.currency as currency, SUM(CAST(transfer."amount" AS DECIMAL)) as balance, SUM(CAST(transfer."usdAmount" AS DECIMAL)) as usdBalance'
            )
            .getRawMany();
        return groupedSums;
    }

    public static async getWithdrawalsByStatus(status: string = "PENDING"): Promise<Transfer[]> {
        return this.createQueryBuilder("transfer")
            .leftJoinAndSelect("transfer.wallet", "wallet", 'wallet.id = transfer."walletId"')
            .leftJoinAndSelect("wallet.user", "user", 'user.id = wallet."userId"')
            .leftJoinAndSelect("user.profile", "profile", 'profile."userId" = user.id')
            .where(`transfer.action = 'withdraw' AND transfer."status" = :status`, { status })
            .orderBy('transfer."createdAt"', "ASC")
            .getMany();
    }

    public static async getAuditedWithdrawals(): Promise<Transfer[]> {
        return this.createQueryBuilder("transfer")
            .leftJoinAndSelect("transfer.wallet", "wallet", 'wallet.id = transfer."walletId"')
            .leftJoinAndSelect("wallet.user", "user", 'user.id = wallet."userId"')
            .leftJoinAndSelect("user.profile", "profile", 'profile."userId" = user.id')
            .where(`transfer.action = 'withdraw' AND transfer."status" = 'approved' OR transfer."status" = 'rejected'`)
            .orderBy('transfer."createdAt"', "ASC")
            .getMany();
    }

    public static async transferCampaignPayoutFee(campaign: Campaign, amount: BigNumber): Promise<Transfer> {
        const org = await Org.findOne({ where: { name: "raiinmaker" }, relations: ["wallet"] });
        if (!org) throw new Error("raiinmaker org not found for payout");
        const transfer = new Transfer();
        transfer.action = "fee";
        transfer.campaign = campaign;
        transfer.amount = amount;
        transfer.wallet = org.wallet;
        await transfer.save();
        await performCurrencyTransfer(campaign.escrow.id, org.wallet.id, campaign.crypto.type, amount.toString(), true);
        return transfer;
    }

    public static newFromWalletPayout(wallet: Wallet, campaign: Campaign, amount: BigNumber): Transfer {
        const transfer = new Transfer();
        transfer.action = "transfer";
        transfer.campaign = campaign;
        transfer.amount = amount;
        transfer.wallet = wallet;
        return transfer;
    }

    public static newFromCampaignPayout(wallet: Wallet, campaign: Campaign, amount: BigNumber): Transfer {
        const transfer = new Transfer();
        transfer.action = "transfer";
        transfer.campaign = campaign;
        transfer.amount = amount;
        transfer.wallet = wallet;
        transfer.currency = campaign.type == "crypto" ? campaign.crypto.type : campaign.type;
        return transfer;
    }

    public static newFromCampaignPayoutRefund(wallet: Wallet, campaign: Campaign, amount: BigNumber): Transfer {
        const transfer = new Transfer();
        transfer.action = "refund";
        transfer.campaign = campaign;
        transfer.amount = amount;
        transfer.wallet = wallet;
        return transfer;
    }

    public static newFromWithdraw(
        wallet: Wallet,
        amount: BigNumber,
        ethAddress?: string,
        paypalAddress?: string,
        currency: string = "coiin",
        currencyPrice: BigNumber = new BN(0)
    ): Transfer {
        const transfer = new Transfer();
        transfer.amount = amount;
        transfer.action = "withdraw";
        transfer.wallet = wallet;
        transfer.status = "PENDING";
        transfer.currency = currency;
        transfer.usdAmount = currencyPrice;
        if (ethAddress) transfer.ethAddress = ethAddress;
        if (paypalAddress) transfer.paypalAddress = paypalAddress;
        return transfer;
    }

    public static newPendingUsdDeposit(
        wallet: Wallet,
        org: Org,
        amount: BigNumber,
        stripeCardId?: string,
        paypalAddress?: string
    ): Transfer {
        const transfer = new Transfer();
        transfer.wallet = wallet;
        transfer.org = org;
        transfer.amount = amount;
        transfer.status = "PENDING";
        transfer.currency = "usd";
        transfer.action = "deposit";
        if (stripeCardId) transfer.stripeCardId = stripeCardId;
        if (paypalAddress) transfer.paypalAddress = paypalAddress;
        return transfer;
    }

    public static newFromDeposit(wallet: Wallet, amount: BigNumber, ethAddress: string, transactionHash: string) {
        const transfer = new Transfer();
        transfer.amount = amount;
        transfer.action = "deposit";
        transfer.ethAddress = ethAddress;
        transfer.transactionHash = transactionHash;
        transfer.wallet = wallet as Wallet;
        return transfer;
    }

    public static newFromRaffleSelection(wallet: Wallet, campaign: Campaign, prize: RafflePrize) {
        const transfer = new Transfer();
        transfer.amount = new BN(0);
        transfer.action = "prize";
        transfer.wallet = wallet;
        transfer.campaign = campaign;
        transfer.rafflePrize = prize;
        return transfer;
    }
}
