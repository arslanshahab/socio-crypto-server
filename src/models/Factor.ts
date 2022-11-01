import {
    BaseEntity,
    Entity,
    PrimaryGeneratedColumn,
    Column,
    ManyToOne,
    CreateDateColumn,
    UpdateDateColumn,
} from "typeorm";
import { User } from "./User";

@Entity()
export class Factor extends BaseEntity {
    @PrimaryGeneratedColumn("uuid")
    public id: string;

    @Column({ nullable: true })
    public name: string;

    @Column({ nullable: false })
    public type: string;

    @Column({ nullable: false })
    public value: string;

    @Column({ nullable: false })
    public provider: string;

    @ManyToOne((_type) => User, (user) => user.factors)
    public user: User;

    @CreateDateColumn()
    public createdAt: Date;

    @UpdateDateColumn()
    public updatedAt: Date;
}
