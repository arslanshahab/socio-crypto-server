import {
  BaseEntity,
  Column,
  CreateDateColumn,
  Entity,
  OneToMany, OneToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn
} from "typeorm";
import {Campaign} from "./Campaign";
import {Transfer} from "./Transfer";
import {Admin} from "./Admin";
import {HourlyCampaignMetric} from "./HourlyCampaignMetric";
import { FundingWallet } from './FundingWallet';


@Entity()
export class Org extends BaseEntity {
  @PrimaryGeneratedColumn('uuid')
  public id: string;

  @Column()
  public name: string;

  @Column({nullable: true})
  public stripeId: string;

  @OneToMany(
    _type => Campaign,
    campaign => campaign.org
  )
  public campaigns: Campaign[];

  @OneToMany(
    _type => Transfer,
    transfer => transfer.org
  )
  public transfers: Transfer[];

  @OneToMany(
    _type => Admin,
    admin => admin.org
  )
  public admins: Admin[];

  @OneToMany(
    _type => HourlyCampaignMetric,
    metrics => metrics.org
  )
  public hourlyMetrics: HourlyCampaignMetric[];

  @OneToOne(
    _type => FundingWallet,
    wallet => wallet.org
  )
  public fundingWallet: FundingWallet;

  @CreateDateColumn()
  public createdAt: Date;

  @UpdateDateColumn()
  public updatedAt: Date;

  public asV1() {
    const returnValue: Org = {
      ...this
    };
    if (this.campaigns) returnValue.campaigns = returnValue.campaigns.map(campaign => campaign.asV1())
    if (this.transfers) returnValue.transfers = returnValue.transfers.map(transfer => transfer.asV1())
    if (this.admins) returnValue.admins = returnValue.admins.map(admin => admin.asV1());
    if (this.hourlyMetrics) returnValue.hourlyMetrics = returnValue.hourlyMetrics.map(hourlyMetric => hourlyMetric.asV1())
    if (this.fundingWallet) returnValue.fundingWallet = this.fundingWallet.asV1()
    return returnValue;
  }

  public static newOrg(name: string){
    const org = new Org();
    org.name = name;
    return org;
  }

  public static async getByAdminId(id: string) {
    return await this.createQueryBuilder('org')
      .leftJoinAndSelect('org.fundingWallet', 'wallet', 'wallet."orgId" = org.id')
      .leftJoinAndSelect('wallet.transfers', 'transfer', 'transfer."fundingWalletId" = wallet.id')
      .leftJoinAndSelect('wallet.addresses', 'address', 'address."fundingWalletId" = wallet.id')
      .leftJoin('org.admins', 'admin', 'admin."orgId" = org.id')
      .where('admin.id = :id', { id })
      .getOne();
  }

  public static async listOrgs (skip: number, take: number) {
    return await this.createQueryBuilder('org')
      .skip(skip)
      .take(take)
      .getMany()
  }
}
