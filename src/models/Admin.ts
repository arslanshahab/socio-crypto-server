import {BaseEntity, Column, Entity, ManyToOne, PrimaryGeneratedColumn} from "typeorm";
import {User} from "./User";
import {Org} from "./Org";

@Entity()
export class Admin extends BaseEntity {
  @PrimaryGeneratedColumn('uuid')
  public id: string;

  @Column()
  public firebaseId: string;

  @Column({nullable: false, default: 'raiinmaker'})
  public name: string;

  @ManyToOne(
    _type => User,
    user => user.admins
  )
  public user: User;

  @ManyToOne(
    _type => Org,
    org => org.admins
  )
  public org: Org;

  public asV1() {
    return {
      name: this.name
    }
  }

  public static async listAdminsByOrg (orgId: string, skip: number, take: number) {
    return await this.createQueryBuilder('admin')
      .where('admin."orgId" = :orgId', {orgId})
      .skip(skip)
      .take(take)
      .getMany()
  }
}
