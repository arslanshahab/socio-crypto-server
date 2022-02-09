import {
    PrimaryGeneratedColumn,
    Entity,
    BaseEntity,
    OneToOne,
    JoinColumn,
    CreateDateColumn,
    UpdateDateColumn,
    OneToMany,
} from "typeorm";
import { Transfer } from "./Transfer";
import { User } from "./User";
import { WalletCurrency } from "./WalletCurrency";
import { Org } from "./Org";
import { ExternalAddress } from "./ExternalAddress";
import { Escrow } from "./Escrow";
import { Currency } from "./Currency";
import { CustodialAddress } from "./CustodialAddress";

@Entity()
export class Wallet extends BaseEntity {
    @PrimaryGeneratedColumn("uuid")
    public id: string;

    @OneToMany((_type) => WalletCurrency, (walletCurrency) => walletCurrency.wallet, { eager: true })
    public walletCurrency: WalletCurrency[];

    @OneToOne((_type) => Org, (org) => org.wallet)
    @JoinColumn()
    public org: Org;

    @OneToOne((_type) => User, (user) => user.wallet)
    @JoinColumn()
    public user: User;

    @OneToMany((_type) => ExternalAddress, (address) => address.wallet)
    public addresses: ExternalAddress[];

    @OneToMany((_type) => Currency, (currency) => currency.wallet)
    public currency: Currency[];

    @OneToMany((_type) => CustodialAddress, (custodialAddress) => custodialAddress.wallet)
    public custodialAddress: CustodialAddress[];

    @OneToMany((_type) => Escrow, (escrow) => escrow.wallet)
    public escrows: Escrow[];

    @OneToMany((_type) => Transfer, (transfer) => transfer.wallet, { eager: true })
    public transfers: Transfer[];

    @CreateDateColumn()
    public createdAt: Date;

    @UpdateDateColumn()
    public updatedAt: Date;

    public asV1(pendingBalance?: string) {
        const returnedWallet: Wallet = {
            ...this,
            pendingBalance: pendingBalance,
            transfers: this.transfers ? this.transfers.map((transfer) => transfer.asV1()) : [],
        };
        if (this.walletCurrency) returnedWallet.walletCurrency = this.walletCurrency.map((token) => token.asV1());
        return returnedWallet;
    }
}
