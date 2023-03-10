import {
    Entity,
    BaseEntity,
    PrimaryGeneratedColumn,
    Column,
    OneToOne,
    JoinColumn,
    CreateDateColumn,
    UpdateDateColumn,
    DeleteDateColumn,
} from "typeorm";
import { StringifiedArrayTransformer } from "../util/transformers";
import { User } from "./User";
import { sha256Hash } from "../util/crypto";

@Entity()
export class Profile extends BaseEntity {
    @PrimaryGeneratedColumn("uuid")
    public id: string;

    @Column({ nullable: false, unique: true })
    public username: string;

    @Column({ nullable: true })
    public recoveryCode: string;

    @Column({ nullable: true })
    public deviceToken: string;

    @Column({ nullable: true })
    public email: string;

    @Column({ nullable: true })
    public profilePicture: string;

    @Column({ type: "text", nullable: true })
    public ageRange: string | null;

    @Column({ type: "text", nullable: true })
    public city: string | null;

    @Column({ type: "text", nullable: true })
    public state: string | null;

    @Column({ type: "text", nullable: true })
    public country: string | null;

    @Column({ type: "text", nullable: false, default: "[]", transformer: StringifiedArrayTransformer })
    public interests: string[];

    @Column({ type: "text", nullable: false, default: "[]", transformer: StringifiedArrayTransformer })
    public values: string[];

    @Column({ type: "text", nullable: false, default: "[]", transformer: StringifiedArrayTransformer })
    public platforms: string[];

    @OneToOne(
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        (_type) => User,
        (user) => user.profile
    )
    @JoinColumn()
    public user: User;

    @CreateDateColumn()
    public createdAt: Date;

    @UpdateDateColumn()
    public updatedAt: Date;

    @DeleteDateColumn({ default: null })
    public deletedAt: Date;

    public isRecoveryCodeValid = (code: string) => {
        return this.recoveryCode === sha256Hash(code);
    };
}
