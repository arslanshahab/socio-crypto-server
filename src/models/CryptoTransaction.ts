import {
  BaseEntity,
  Column,
  CreateDateColumn,
  Entity,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn
} from "typeorm";
import {CryptoCurrency} from "./CryptoCurrency";


@Entity()
export class CryptoTransaction extends BaseEntity {
  @PrimaryGeneratedColumn('uuid')
  public id: string;

  @Column({nullable: true})
  public blockNumber: number;

  @Column({nullable: true})
  public from: string;

  @Column({nullable: true})
  public to: string;

  @Column({nullable: true})
  public hash: string;

  @Column({nullable: true})
  public type: string;

  @Column({nullable: true})
  public convertedValue: string;

  @ManyToOne(
    _type => CryptoCurrency,
    crypto => crypto.missedTransfers
  )
  public crypto: CryptoCurrency;

  @CreateDateColumn()
  public createdAt: Date;

  @UpdateDateColumn()
  public updatedAt: Date;

  public asV1(): CryptoTransaction {
    return {
      ...this,
      crypto: this.crypto.asV1()
    }
  }
}
