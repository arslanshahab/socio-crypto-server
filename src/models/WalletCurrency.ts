import {
    BaseEntity,
    Column,
    CreateDateColumn,
    Entity,
    ManyToOne,
    PrimaryGeneratedColumn,
    UpdateDateColumn,
} from "typeorm";
import { BigNumberEntityTransformer } from "../util/transformers";
import BigNumber from "bignumber.js";
import { Wallet } from "./Wallet";
import { COIIN } from "../util/constants";

@Entity()
export class WalletCurrency extends BaseEntity {
    @PrimaryGeneratedColumn("uuid")
    public id: string;

    @Column({ nullable: false, default: "Coiin" })
    public type: string;

    @Column({ type: "varchar", nullable: false, default: 0, transformer: BigNumberEntityTransformer })
    public balance: BigNumber;

    @ManyToOne((_type) => Wallet, (wallet) => wallet.walletCurrency)
    public wallet: Wallet;

    @CreateDateColumn()
    public createdAt: Date;

    @UpdateDateColumn()
    public updatedAt: Date;

    public asV1() {
        const returnedCurrency: WalletCurrency = {
            ...this,
            balance: parseFloat(this.balance.toString()),
        };
        return returnedCurrency;
    }

    public static async getFundingWalletCurrency(currencyType: string = "coiin", wallet: Wallet) {
        let walletCurrency = await WalletCurrency.findOne({ where: { type: currencyType, wallet } });
        if (!walletCurrency) {
            const newCurrency = WalletCurrency.newWalletCurrency(currencyType, wallet);
            await newCurrency.save();
            walletCurrency = await WalletCurrency.findOneOrFail({ where: { type: currencyType, wallet } });
        }
        return walletCurrency;
    }

    public static newWalletCurrency(type: string, wallet?: Wallet) {
        const currency = new WalletCurrency();
        currency.type = type.toLowerCase();
        if (wallet) currency.wallet = wallet;
        return currency;
    }

    public static async addNewWalletCurrency(type: string, wallet?: Wallet, balance?: number) {
        const currency = new WalletCurrency();
        currency.type = type;
        if (wallet) currency.wallet = wallet;
        if (balance) currency.balance = new BigNumber(balance);
        return currency.save();
    }

    public static async getTotalCoiinBalance(ids: string[]) {
        return await this.createQueryBuilder("model")
            .select('SUM(model.balance::numeric) as "totalCoiins"')
            .where('model."walletId" IN(:...ids)', { ids })
            .andWhere(`model.type ilike '%' || :currency || '%'`, { currency: COIIN })
            .getRawMany();
    }
}
