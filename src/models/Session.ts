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

    @Column({ nullable: false })
    public token: string;

    @Column({ nullable: true })
    public ip: string;

    @Column({ nullable: true })
    public deviceInfo: string;

    @ManyToOne((_type) => User, (user) => user.admins)
    public user: User;

    @Column({ nullable: true })
    public lastLogin: Date;

    @Column({ nullable: true })
    public loggedInAt: Date;

    @Column({ nullable: true })
    public loggedout: boolean;

    @Column({ nullable: true })
    public loggedOutAt: Date;

    @Column({ nullable: false })
    public expiry: Date;

    @CreateDateColumn()
    public createdAt: Date;

    @UpdateDateColumn()
    public updatedAt: Date;
}
