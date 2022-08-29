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

@Entity()
export class Session extends BaseEntity {
    @PrimaryGeneratedColumn("uuid")
    public id: string;

    @Column({ nullable: true })
    public ip: string;

    @Column({ nullable: true })
    public deviceInfo: string;

    @ManyToOne((_type) => User, (user) => user.admins)
    public user: User;

    @Column({ nullable: true })
    public lastLogin: Date;

    @Column({ nullable: true, default: false })
    public logout: boolean;

    @Column({ nullable: true })
    public logoutAt: Date;

    @Column({ nullable: false })
    public expiry: Date;

    @CreateDateColumn()
    public createdAt: Date;

    @UpdateDateColumn()
    public updatedAt: Date;
}
