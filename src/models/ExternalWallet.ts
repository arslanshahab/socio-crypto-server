import { BaseEntity, Column, CreateDateColumn, Entity, In, ManyToOne, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';
import { BigNumber } from 'bignumber.js';
import { BigNumberEntityTransformer } from '../util/transformers';
import { User } from './User';
import { generateRandomNonce } from '../util/helpers';
import { Org } from './Org';

@Entity()
export class ExternalWallet extends BaseEntity {
  @PrimaryGeneratedColumn('uuid')
  public id: string;

  @Column({ unique: true })
  public ethereumAddress: string;

  @Column({ type: 'boolean', default: false })
  public claimed: boolean;

  @Column({ nullable: false })
  public claimMessage: string;

  @Column({ type: 'varchar', nullable: false, default: 0, transformer: BigNumberEntityTransformer })
  public balance: BigNumber;

  @CreateDateColumn()
  public createdAt: Date;

  @UpdateDateColumn()
  public updatedAt: Date;

  @ManyToOne(
    _type => User,
    user => user.externalWallets
  )
  public user: User;

  @ManyToOne(
    _type => Org,
    org => org.externalWallets
  )
  public org: Org;

  public asV1() {
    return {
      ethereumAddress: this.ethereumAddress,
      message: this.claimMessage,
      claimed: this.claimed,
      balance: parseFloat(this.balance.toString()),
    };
  }

  public static newFromAttachment(address: string, user: User|Org, admin: boolean = false): ExternalWallet {
    const wallet = new ExternalWallet();
    wallet.ethereumAddress = address;
    if (admin) wallet.org = user as Org;
    else wallet.user = user as User;
    wallet.claimMessage = `I am signing this nonce: ${generateRandomNonce()}`;
    return wallet;
  }

  public static async getByUserAndAddress(user: User|Org, address: string, admin: boolean = false) {
    let query = this.createQueryBuilder('external')
      .where('external."ethereumAddress" = :address', { address });
    if (admin) {
      query = query.leftJoin('external.org', 'org', 'org.id = external."orgId"');
      query = query.leftJoin('org.admins', 'admin', 'admin."orgId" = org.id');
      query = query.andWhere('admin.id = :admin', { admin: user.id });
    } else {
      query = query.leftJoin('external.user', 'user', 'user.id = external."userId"');
      query = query.andWhere('user.id = :user', { user: user.id });
    }
    return await query.getOne();
  }

  public static async getWalletsByAddresses(addresses: string[]) {
    if (addresses.length === 0) return {};
    const normalizedWalletAddresses = addresses.map(address => address.toLowerCase());
    // add in the org and org wallet as relations
    const wallets = await ExternalWallet.find({ where: { claimed: true, ethereumAddress: In(normalizedWalletAddresses) }, relations: ['user', 'user.wallet'] });
    return wallets.reduce((accum: {[key: string]: ExternalWallet}, curr: ExternalWallet) => {
      accum[curr.ethereumAddress.toLowerCase()] = curr;
      return accum;
    }, {});
  }

  public static async getWalletByAddressAndUserId(id: string, ethereumAddress: string, admin: boolean = false) {
    const normalizedAddress = ethereumAddress.toLowerCase();
    let query = this.createQueryBuilder('wallet')
      .where('wallet."ethereumAddress" = :address', { address: normalizedAddress });
    if (admin) {
      query = query.leftJoinAndSelect('wallet.org', 'org', 'org.id = wallet."orgId"');
      query = query.leftJoin('org.admins', 'admin', 'admin."orgId" = org.id');
      query = query.andWhere('admin."firebaseId" = :admin', { admin: id });
    } else {
      query = query.leftJoinAndSelect('wallet.user', 'user', 'user.id = wallet."userId"');
      query = query.andWhere('user."identityId" = :user', { user: id });
    }
    return await query.getOne();
  }
}