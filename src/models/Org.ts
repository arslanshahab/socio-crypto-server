import {
    BaseEntity,
    Column,
    CreateDateColumn,
    Entity,
    OneToMany,
    OneToOne,
    PrimaryGeneratedColumn,
    UpdateDateColumn,
} from "typeorm";
import { Campaign } from "./Campaign";
import { Transfer } from "./Transfer";
import { Admin } from "./Admin";
import { HourlyCampaignMetric } from "./HourlyCampaignMetric";
import { CampaignStatus } from "../types";
import { Wallet } from "./Wallet";
import { TatumAccount } from "../models/TatumAccount";
import { TatumClient } from "../clients/tatumClient";

@Entity()
export class Org extends BaseEntity {
    @PrimaryGeneratedColumn("uuid")
    public id: string;

    @Column()
    public name: string;

    @Column({ nullable: true })
    public stripeId: string;

    @OneToMany((_type) => Campaign, (campaign) => campaign.org)
    public campaigns: Campaign[];

    @OneToMany((_type) => Transfer, (transfer) => transfer.org)
    public transfers: Transfer[];

    @OneToMany((_type) => Admin, (admin) => admin.org)
    public admins: Admin[];

    @OneToMany((_type) => HourlyCampaignMetric, (metrics) => metrics.org)
    public hourlyMetrics: HourlyCampaignMetric[];

    @OneToOne((_type) => Wallet, (wallet) => wallet.org)
    public wallet: Wallet;

    @OneToMany((_type) => TatumAccount, (account) => account.org)
    public tatumAccounts: TatumAccount[];

    @CreateDateColumn()
    public createdAt: Date;

    @UpdateDateColumn()
    public updatedAt: Date;

    public asV1() {
        const returnValue: Org = {
            ...this,
        };
        if (this.campaigns) returnValue.campaigns = returnValue.campaigns.map((campaign) => campaign.asV1());
        if (this.transfers) returnValue.transfers = returnValue.transfers.map((transfer) => transfer.asV1());
        if (this.admins) returnValue.admins = returnValue.admins.map((admin) => admin.asV1());
        if (this.hourlyMetrics)
            returnValue.hourlyMetrics = returnValue.hourlyMetrics.map((hourlyMetric) => hourlyMetric.asV1());
        if (this.wallet) returnValue.wallet = this.wallet.asV1();
        return returnValue;
    }

    public static newOrg(name: string) {
        const org = new Org();
        org.name = name;
        return org;
    }

    public static async listOrgCampaignsByWalletIdAndStatus(walletId: string, status: CampaignStatus) {
        return await this.createQueryBuilder("org")
            .leftJoinAndSelect("org.wallet", "wallet", 'wallet."orgId" = org.id')
            .leftJoinAndSelect("wallet.currency", "currency", 'currency."walletId" = currency.id')
            .leftJoinAndSelect("org.campaigns", "campaign", 'campaign."orgId" = org.id')
            .leftJoinAndSelect("campaign.crypto", "crypto", 'campaign."cryptoId" = crypto.id')
            .where("campaign.status = :status", { status })
            .andWhere("wallet.id = :walletId", { walletId })
            .getOne();
    }

    public static async getByAdminId(id: string) {
        return await this.createQueryBuilder("org")
            .leftJoinAndSelect("org.wallet", "wallet", 'wallet."orgId" = org.id')
            .leftJoinAndSelect("wallet.transfers", "transfer", 'transfer."walletId" = wallet.id')
            .leftJoinAndSelect("wallet.addresses", "address", 'address."walletId" = wallet.id')
            .leftJoinAndSelect("wallet.currency", "currency", 'currency."walletId" = wallet.id')
            .leftJoin("org.admins", "admin", 'admin."orgId" = org.id')
            .where("admin.id = :id", { id })
            .getOne();
    }

    public static async listOrgs(skip: number, take: number) {
        return await this.createQueryBuilder("org").skip(skip).take(take).getMany();
    }

    public async isCurrencyAdded(currency: string): Promise<boolean> {
        let org: Org | undefined = this;
        if (!org.wallet || !org.wallet.currency || !org.tatumAccounts) {
            org = await Org.findOne({
                where: { id: this.id },
                relations: ["wallet", "wallet.currency", "tatumAccounts"],
            });
        }
        if (org) {
            const walletCurrency = org.wallet.currency.find((item) => item.type === currency.toLowerCase());
            if (walletCurrency) return true;
            const tatumAccount = org.tatumAccounts.find((item) => item.currency === currency.toUpperCase());
            return Boolean(tatumAccount);
        }
        return false;
    }

    public async updateBalance(currency: string, operation: "add" | "subtract", amount: number): Promise<any> {
        let org: Org | undefined = this;
        if (!org.wallet || !org.wallet.currency) {
            org = await Org.findOne({ where: { id: this.id }, relations: ["wallet", "wallet.currency"] });
        }
        if (org) {
            let assetBalance = org.wallet.currency.find((item) => item.type === currency.toLowerCase());
            if (assetBalance) {
                assetBalance.balance =
                    operation === "add" ? assetBalance.balance.plus(amount) : assetBalance.balance.minus(amount);
                return assetBalance.save();
            }
        }
    }

    public async getAvailableBalance(currency: string): Promise<number> {
        let org: Org | undefined = this;
        if (!org.wallet || !org.wallet.currency || !org.tatumAccounts) {
            org = await Org.findOne({
                where: { id: this.id },
                relations: ["wallet", "wallet.currency", "tatumAccounts"],
            });
        }
        if (org) {
            const walletCurrency = org.wallet.currency.find((item) => item.type === currency.toLowerCase());
            if (walletCurrency) return walletCurrency.balance.toNumber();
            const tatumAccount = org.tatumAccounts.find((item) => item.currency === currency.toUpperCase());
            const tatumBalance = await TatumClient.getAccountBalance(tatumAccount?.accountId || "");
            return parseFloat(tatumBalance.availableBalance);
        }
        return 0;
    }
}
