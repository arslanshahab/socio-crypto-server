import {
    BaseEntity,
    Column,
    CreateDateColumn,
    Entity,
    ManyToOne,
    PrimaryGeneratedColumn,
    UpdateDateColumn,
} from "typeorm";
import { User } from "./User";
import { Org } from "./Org";
import { RAIINMAKER_ORG_NAME } from "../util/constants";

@Entity()
export class Admin extends BaseEntity {
    @PrimaryGeneratedColumn("uuid")
    public id: string;

    @Column()
    public firebaseId: string;

    @Column({ nullable: false, default: RAIINMAKER_ORG_NAME })
    public name: string;

    //  2FA
    @Column({ default: false })
    public twoFactorEnabled: boolean;

    @ManyToOne((_type) => User, (user) => user.admins)
    public user: User;

    @ManyToOne((_type) => Org, (org) => org.admins)
    public org: Org;

    @CreateDateColumn()
    public createdAt: Date;

    @UpdateDateColumn()
    public updatedAt: Date;

    public asV1() {
        const returnValue: Admin = {
            ...this,
        };
        if (this.user) returnValue.user = this.user.asV1();
        if (this.org) returnValue.org = this.org.asV1();
        return returnValue;
    }

    public static async listAdminsByOrg(orgId: string, skip: number, take: number) {
        return await this.createQueryBuilder("admin")
            .where('admin."orgId" = :orgId', { orgId })
            .skip(skip)
            .take(take)
            .getMany();
    }
}
