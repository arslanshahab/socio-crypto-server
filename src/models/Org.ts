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
import { TatumClient } from "../clients/tatumClient";
import { Currency } from "./Currency";
import { RAIINMAKER_ORG_NAME } from "../util/constants";
import { SymbolNetworkParams } from "../types.d";
import { Token } from "./Token";

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
            .leftJoinAndSelect("wallet.walletCurrency", "walletCurrency", 'walletCurrency."walletId" = wallet.id')
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
            .leftJoinAndSelect("wallet.walletCurrency", "walletCurrency", 'walletCurrency."walletId" = wallet.id')
            .leftJoin("org.admins", "admin", 'admin."orgId" = org.id')
            .where("admin.id = :id", { id })
            .getOne();
    }

    public static async listOrgs(skip: number, take: number) {
        return await this.createQueryBuilder("org").skip(skip).take(take).getMany();
    }
    public static async orgDetails() {
        return await this.createQueryBuilder("org")
            .leftJoin("org.campaigns", "campaign")
            .leftJoin("org.admins", "admin")
            .select("org.name", "name")
            .addSelect("org.createdAt", "createdAt")
            .addSelect("COUNT(campaign.id)", "campaignCount")
            .addSelect("COUNT(DISTINCT(admin.id))", "adminCount")
            .groupBy("org.name")
            .addGroupBy("org.createdAt")
            .getRawMany();
    }

    public async updateBalance(currency: string, operation: "add" | "subtract", amount: number): Promise<any> {
        try {
            let org: Org | undefined = this;
            if (!org.wallet || !org.wallet.walletCurrency) {
                org = await Org.findOne({ where: { id: this.id }, relations: ["wallet", "wallet.walletCurrency"] });
            }
            if (org) {
                let assetBalance = org.wallet.walletCurrency.find((item) => item.type === currency.toLowerCase());
                if (assetBalance) {
                    assetBalance.balance =
                        operation === "add" ? assetBalance.balance.plus(amount) : assetBalance.balance.minus(amount);
                    return assetBalance.save();
                }
            }
        } catch (error) {
            console.log(error.message);
            throw new Error(error.message);
        }
    }

    public async getAvailableBalance(token: Token): Promise<number> {
        try {
            const currency = await Currency.findOne({
                where: { wallet: await Wallet.findOne({ where: { org: this } }), token },
            });
            if (!currency) throw new Error("Currency not found for org.");
            const tatumBalance = await TatumClient.getAccountBalance(currency.tatumId);
            return parseFloat(tatumBalance.availableBalance || "0");
        } catch (error) {
            console.log(error.message);
            throw new Error(error.message);
        }
    }

    public static getCurrencyForRaiinmaker = async (data: SymbolNetworkParams) => {
        const raiinmakerOrg = await Org.findOne({ where: { name: RAIINMAKER_ORG_NAME }, relations: ["wallet"] });
        if (!raiinmakerOrg) throw new Error(`Org not found for ${RAIINMAKER_ORG_NAME}.`);
        return await TatumClient.findOrCreateCurrency({ ...data, wallet: raiinmakerOrg.wallet });
    };
}
