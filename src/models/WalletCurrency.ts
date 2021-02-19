import {
  BaseEntity,
  Column,
  CreateDateColumn,
  Entity,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn
} from "typeorm";
import {BigNumberEntityTransformer} from "../util/transformers";
import BigNumber from "bignumber.js";
import {Wallet} from "./Wallet";


@Entity()
export class WalletCurrency extends BaseEntity {
  @PrimaryGeneratedColumn('uuid')
  public id: string;

  @Column({nullable: false, default: 'Coiin'})
  public type: string;

  @Column({ type: 'varchar', nullable: false, default: 0, transformer: BigNumberEntityTransformer })
  public balance: BigNumber;

  @ManyToOne(
    _type => Wallet,
    wallet => wallet.currency
  )
  public wallet: Wallet;

  @CreateDateColumn()
  public createdAt: Date;

  @UpdateDateColumn()
  public updatedAt: Date;

  public asV1() {
    const returnedCurrency: WalletCurrency = {
      ...this,
      balance: parseFloat(this.balance.toString())
    }
    return returnedCurrency;
  }

  public static async getFundingWalletCurrency(currencyType: string = 'coiin', wallet: Wallet) {
    let walletCurrency = await WalletCurrency.findOne({where: {type: currencyType, wallet}})
    if (!walletCurrency) {
      const newCurrency = WalletCurrency.newWalletCurrency(currencyType, wallet);
      await newCurrency.save();
      walletCurrency = await WalletCurrency.findOneOrFail({where: {type: currencyType, wallet}})
    }
    return walletCurrency;
  }

  public static newWalletCurrency(type: string, wallet?: Wallet) {
    const currency = new WalletCurrency();
    currency.type = type.toLowerCase();
    if (wallet) currency.wallet = wallet;
    return currency;
  }
}
