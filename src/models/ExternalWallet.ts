import { BaseEntity, Column, CreateDateColumn, Entity, In, ManyToOne, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';
import { BigNumber } from 'bignumber.js';
import { BigNumberEntityTransformer } from '../util/transformers';
import { User } from './User';
import { generateRandomNonce } from '../util/helpers';

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

  public asV1() {
    return {
      ethereumAddress: this.ethereumAddress,
      message: this.claimMessage,
      claimed: this.claimed,
      balance: parseFloat(this.balance.toString()),
    };
  }

  public static newFromAttachment(address: string, user: User): ExternalWallet {
    const wallet = new ExternalWallet();
    wallet.ethereumAddress = address;
    wallet.user = user;
    wallet.claimMessage = `I am signing this nonce: ${generateRandomNonce()}`;
    return wallet;
  }

  public static async getByUserAndAddress(user: User, address: string) {
    const normalizedAddress = address.toLowerCase();
    return await this.createQueryBuilder('external')
      .leftJoin('external.user', 'user', 'external."userId" = user.id')
      .where('user.id = :user AND external."ethereumAddress" = :address', { user: user.id, address: normalizedAddress })
      .getOne();
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
}