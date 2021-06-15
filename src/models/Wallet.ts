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

@Entity()
export class Wallet extends BaseEntity {
    @PrimaryGeneratedColumn("uuid")
    public id: string;

    @OneToMany((_type) => WalletCurrency, (currency) => currency.wallet, { eager: true })
    public currency: WalletCurrency[];

    @OneToOne(
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        (_type) => Org,
        (org) => org.wallet
    )
    @JoinColumn()
    public org: Org;

    @OneToOne(
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        (_type) => User,
        (user) => user.wallet
    )
    @JoinColumn()
    public user: User;

    @OneToMany(
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        (_type) => ExternalAddress,
        (address) => address.wallet
    )
    public addresses: ExternalAddress[];

    @OneToMany(
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        (_type) => Escrow,
        (escrow) => escrow.wallet
    )
    public escrows: Escrow[];

    @OneToMany(
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        (_type) => Transfer,
        (transfer) => transfer.wallet,
        { eager: true }
    )
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
        if (this.currency) returnedWallet.currency = this.currency.map((token) => token.asV1());
        return returnedWallet;
    }
}
