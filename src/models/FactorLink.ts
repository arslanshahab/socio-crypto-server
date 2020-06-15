import { BaseEntity, Entity, PrimaryColumn, Column, ManyToOne, CreateDateColumn, UpdateDateColumn } from 'typeorm';
import { User } from './User';

@Entity()
export class FactorLink extends BaseEntity {
  @PrimaryColumn()
  public factorId: string;

  @Column({ nullable: false })
  public type: string;

  @Column({ nullable: false })
  public providerId: string;

  @Column({ nullable: false })
  public identityId: string;

  @ManyToOne(
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    _type => User,
    user => user.factorLinks
  )
  public user: User;

  @CreateDateColumn()
  public createdAt: Date;

  @UpdateDateColumn()
  public updatedAt: Date;
}