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
}
