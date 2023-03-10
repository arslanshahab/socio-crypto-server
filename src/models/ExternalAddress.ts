import {
    BaseEntity,
    Column,
    CreateDateColumn,
    Entity,
    In,
    ManyToOne,
    PrimaryGeneratedColumn,
    UpdateDateColumn,
} from "typeorm";
import { User } from "./User";
import { generateRandomNonce } from "../util";
import { Org } from "./Org";
import { Wallet } from "./Wallet";

@Entity()
export class ExternalAddress extends BaseEntity {
    @PrimaryGeneratedColumn("uuid")
    public id: string;

    @Column({ unique: true })
    public ethereumAddress: string;

    @Column({ type: "boolean", default: false })
    public claimed: boolean;

    @Column({ nullable: false })
    public claimMessage: string;

    @CreateDateColumn()
    public createdAt: Date;

    @UpdateDateColumn()
    public updatedAt: Date;

    @ManyToOne((_type) => Wallet, (wallet) => wallet.addresses)
    public wallet: Wallet;

    @ManyToOne((_type) => User, (user) => user.addresses)
    public user: User;

    public asV1() {
        return {
            ethereumAddress: this.ethereumAddress,
            message: this.claimMessage,
            claimed: this.claimed,
        };
    }

    public static newFromAttachment(
        address: string,
        attachment: Wallet | User,
        user: boolean = false
    ): ExternalAddress {
        const wallet = new ExternalAddress();
        wallet.ethereumAddress = address;
        if (!user) wallet.wallet = attachment as Wallet;
        else wallet.user = attachment as User;
        wallet.claimMessage = `I am signing this nonce: ${generateRandomNonce()}`;
        return wallet;
    }

    public static async getByUserAndAddress(user: User | Org, address: string, admin: boolean = false) {
        let query = this.createQueryBuilder("external").where('external."ethereumAddress" = :address', { address });
        if (admin) {
            query = query.leftJoinAndSelect("external.wallet", "wallet", 'external."walletId" = wallet.id');
            query = query.leftJoin("wallet.org", "org", 'org.id = wallet."orgId"');
            query = query.andWhere("org.id = :org", { org: user.id });
        } else {
            query = query.leftJoinAndSelect("external.user", "user", 'user.id = external."userId"');
            query = query.andWhere("user.id = :user", { user: user.id });
        }
        return await query.getOne();
    }

    public static async getWalletsByAddresses(addresses: string[]) {
        if (addresses.length === 0) return {};
        const normalizedWalletAddresses = addresses.map((address) => address.toLowerCase());
        const wallets = await ExternalAddress.find({
            where: { claimed: true, ethereumAddress: In(normalizedWalletAddresses) },
            relations: ["wallet"],
        });
        return wallets.reduce((accum: { [key: string]: ExternalAddress }, curr: ExternalAddress) => {
            if (curr.wallet) accum[curr.ethereumAddress.toLowerCase()] = curr;
            return accum;
        }, {});
    }

    public static async getWalletByAddressAndUserId(id: string, ethereumAddress: string, admin: boolean = false) {
        const normalizedAddress = ethereumAddress.toLowerCase();
        let query = this.createQueryBuilder("wallet").where('wallet."ethereumAddress" = :address', {
            address: normalizedAddress,
        });
        if (admin) {
            query = query.leftJoinAndSelect("wallet.org", "org", 'org.id = wallet."orgId"');
            query = query.leftJoin("org.admins", "admin", 'admin."orgId" = org.id');
            query = query.andWhere('admin."firebaseId" = :admin', { admin: id });
        } else {
            query = query.leftJoinAndSelect("wallet.user", "user", 'user.id = wallet."userId"');
            query = query.andWhere('user."identityId" = :user', { user: id });
        }
        return await query.getOne();
    }
}
