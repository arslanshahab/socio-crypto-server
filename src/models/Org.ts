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
    return {
      name: this.name
    }
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
