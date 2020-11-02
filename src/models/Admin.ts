import {BaseEntity, Column, Entity, ManyToOne, PrimaryGeneratedColumn} from "typeorm";
import {User} from "./User";
import {Org} from "./Org";

@Entity()
export class Admin extends BaseEntity {
  @PrimaryGeneratedColumn('uuid')
  public id: string;

  @Column()
  public firebaseId: string;

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
}
