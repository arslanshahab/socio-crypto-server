import BigNumber from "bignumber.js";
import {
    PrimaryGeneratedColumn,
    Entity,
    BaseEntity,
    Column,
    CreateDateColumn,
    UpdateDateColumn,
    ManyToOne,
    Between,
    MoreThan,
} from "typeorm";
import { DateUtils } from "typeorm/util/DateUtils";
import { Wallet } from "./Wallet";
import { Campaign } from "./Campaign";
import { BN, getCryptoAssestImageUrl } from "../util";
import { BigNumberEntityTransformer } from "../util/transformers";
import { Org } from "./Org";
import { RafflePrize } from "./RafflePrize";
import { performCurrencyTransfer } from "../controllers/helpers";
import { startOfISOWeek, endOfISOWeek, startOfWeek, startOfDay, subHours } from "date-fns";
import { RAIINMAKER_ORG_NAME, COIIN, TransferAction, TransferStatus, TransferType } from "../util/constants";

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
    public action: TransferAction;

    @Column({ nullable: true })
    public status: TransferStatus;

    @Column({ nullable: true })
    public type: TransferType;

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

    @ManyToOne((_type) => Wallet, (wallet) => wallet.transfers)
    public wallet: Wallet;

    @ManyToOne((_type) => Campaign, (campaign) => campaign.payouts)
    public campaign: Campaign;

    @ManyToOne((_type) => Org, (org) => org.transfers)
    public org: Org;

    @ManyToOne((_type) => RafflePrize, (prize) => prize.transfers)
    public rafflePrize: RafflePrize;

    public symbolImageUrl = "";

    public asV1() {
        const response: any = { ...this, amount: parseFloat(this.amount.toString()) };
        response.symbolImageUrl = getCryptoAssestImageUrl(this.currency);
        if (this.usdAmount) response.usdAmount = parseFloat(this.usdAmount.toString());
        if (this.action) response.action = this?.action?.toUpperCase() || "";
        if (this.status) response.status = this?.status?.toUpperCase() || "";
        if (this.campaign) {
            response.campaign = this.campaign.asV1();
        }
        if (this.wallet) {
            response.wallet = this.wallet.asV1();
        }
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
        const org = await Org.findOne({ where: { name: RAIINMAKER_ORG_NAME }, relations: ["wallet"] });
        if (!org) throw new Error("raiinmaker org not found for payout");
        const transfer = new Transfer();
        transfer.action = TransferAction.FEE;
        transfer.campaign = campaign;
        transfer.amount = amount;
        transfer.wallet = org.wallet;
        await transfer.save();
        await performCurrencyTransfer(campaign.escrow.id, org.wallet.id, campaign.crypto.type, amount.toString(), true);
        return transfer;
    }

    public static async getRewardForThisWeek(wallet: Wallet, type: TransferAction) {
        const currentDate = new Date();
        const start = startOfISOWeek(currentDate);
        const end = endOfISOWeek(currentDate);
        return await this.findOne({ where: { wallet, createdAt: Between(start, end), action: type } });
    }

    public static async getLast24HourRedemption(wallet: Wallet, type: TransferAction) {
        const currentDate = new Date();
        const date = subHours(currentDate, 24);
        return await Transfer.count({
            where: { wallet, action: type, createdAt: MoreThan(DateUtils.mixedDateToUtcDatetimeString(date)) },
        });
    }

    public static async getCurrentWeekRedemption(wallet: Wallet, action: TransferAction) {
        const currentDate = new Date();
        const start = startOfWeek(currentDate);
        const { earnings } = await this.createQueryBuilder("transfer")
            .select("SUM(CAST(transfer.amount AS DECIMAL)) as earnings")
            .where(
                `transfer."createdAt" >= :start AND transfer."walletId" = :wallet AND transfer.action ilike '%' || :action || '%'`,
                {
                    action,
                    start: DateUtils.mixedDateToUtcDatetimeString(start),
                    wallet: wallet.id,
                }
            )
            .getRawOne();
        return earnings;
    }

    public static async getCoinnEarnedToday(wallet: Wallet) {
        const today = startOfDay(new Date());
        const { earnings } = await this.createQueryBuilder("transfer")
            .select("SUM(CAST(transfer.amount AS DECIMAL)) as earnings")
            .where(
                `transfer."createdAt" >= :date AND transfer."walletId" = :wallet AND transfer.currency ilike '%' || :currency || '%'`,
                {
                    currency: COIIN,
                    date: DateUtils.mixedDateToUtcDatetimeString(today),
                    wallet: wallet.id,
                }
            )
            .getRawOne();
        return earnings;
    }

    public static async getTransactionHistory(orgId: String) {
        const query = await this.createQueryBuilder("transfer")
            .leftJoin("transfer.wallet", "wallet", 'transfer."walletId"=wallet.id ')
            .where("wallet.orgId = :orgId", { orgId })
            .getMany();
        return query;
    }

    public static newFromWalletPayout(wallet: Wallet, campaign: Campaign, amount: BigNumber): Transfer {
        const transfer = new Transfer();
        transfer.action = TransferAction.TRANSFER;
        transfer.campaign = campaign;
        transfer.amount = amount;
        transfer.wallet = wallet;
        return transfer;
    }

    public static newFromCampaignPayout(wallet: Wallet, campaign: Campaign, amount: BigNumber): Transfer {
        const transfer = new Transfer();
        transfer.action = TransferAction.TRANSFER;
        transfer.campaign = campaign;
        transfer.amount = amount;
        transfer.wallet = wallet;
        transfer.currency =
            campaign.type == "crypto" ? (campaign.crypto ? campaign.crypto.type : campaign.symbol) : campaign.type;
        return transfer;
    }

    public static newFromCampaignPayoutRefund(wallet: Wallet, campaign: Campaign, amount: BigNumber): Transfer {
        const transfer = new Transfer();
        transfer.action = TransferAction.REFUND;
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
        transfer.action = TransferAction.WITHDRAW;
        transfer.wallet = wallet;
        transfer.status = TransferStatus.PENDING;
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
        transfer.status = TransferStatus.PENDING;
        transfer.currency = "usd";
        transfer.action = TransferAction.DEPOSIT;
        if (stripeCardId) transfer.stripeCardId = stripeCardId;
        if (paypalAddress) transfer.paypalAddress = paypalAddress;
        return transfer;
    }

    public static newFromDeposit(wallet: Wallet, amount: BigNumber, ethAddress: string, transactionHash: string) {
        const transfer = new Transfer();
        transfer.amount = amount;
        transfer.action = TransferAction.DEPOSIT;
        transfer.ethAddress = ethAddress;
        transfer.transactionHash = transactionHash;
        transfer.wallet = wallet as Wallet;
        return transfer;
    }

    public static newFromRaffleSelection(wallet: Wallet, campaign: Campaign, prize: RafflePrize) {
        const transfer = new Transfer();
        transfer.amount = new BN(0);
        transfer.action = TransferAction.PRIZE;
        transfer.wallet = wallet;
        transfer.campaign = campaign;
        transfer.rafflePrize = prize;
        return transfer;
    }

    public static initTatumTransfer(data: {
        txId?: string;
        symbol: string;
        network: string;
        campaign?: Campaign;
        amount: BigNumber;
        tatumId: string;
        wallet: Wallet;
        action: TransferAction;
        status: TransferStatus;
        type: TransferType;
    }) {
        const newTransfer = new Transfer();
        newTransfer.currency = data.symbol;
        if (data.campaign) newTransfer.campaign = data.campaign;
        if (data.txId) newTransfer.transactionHash = data.txId;
        newTransfer.amount = data.amount;
        newTransfer.action = data.action;
        newTransfer.ethAddress = data.tatumId;
        newTransfer.wallet = data.wallet;
        newTransfer.status = data.status;
        newTransfer.type = data.type;
        return newTransfer;
    }

    public static async newReward(data: {
        wallet: Wallet;
        amount: BigNumber;
        symbol: string;
        action: TransferAction;
        status: TransferStatus;
        type: TransferType;
        campaign?: Campaign;
    }) {
        const transfer = new Transfer();
        transfer.amount = data.amount;
        transfer.action = data.action;
        transfer.status = data.status;
        transfer.currency = data.symbol;
        transfer.wallet = data.wallet;
        transfer.type = data.type;
        if (data.campaign) transfer.campaign = data.campaign;
        return await transfer.save();
    }

    public static async getPendingWalletBalances(walletId: string, symbol: string) {
        const { credit } = await this.createQueryBuilder("transfer")
            .select("SUM(CAST(transfer.amount AS DECIMAL)) as credit")
            .where(
                `transfer.type >= :type AND transfer."walletId" = :wallet AND transfer.currency = :symbol AND transfer.status IN (:...statuses)`,
                {
                    symbol,
                    wallet: walletId,
                    type: "CREDIT",
                    statuses: ["FAILED", "PENDING"],
                }
            )
            .getRawOne();
        const { debit } = await this.createQueryBuilder("transfer")
            .select("SUM(CAST(transfer.amount AS DECIMAL)) as debit")
            .where(
                `transfer.type >= :type AND transfer."walletId" = :wallet AND transfer.currency = :symbol AND transfer.status = :status`,
                {
                    symbol,
                    wallet: walletId,
                    type: "DEBIT",
                    status: "PENDING",
                }
            )
            .getRawOne();
        return parseFloat(credit || 0) - parseFloat(debit || 0);
    }
}
