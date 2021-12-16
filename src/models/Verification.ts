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
export class Verification extends BaseEntity {
    @PrimaryGeneratedColumn("uuid")
    public id: string;

    @Column({ nullable: false })
    public email: string;

    @Column({ nullable: true, default: false })
    public verified: boolean;

    @Column({ nullable: false })
    public token: string;

    @ManyToOne((_type) => User, (user) => user.verifications)
    public user: User;

    @CreateDateColumn()
    public createdAt: Date;

    @UpdateDateColumn()
    public updatedAt: Date;

    public static createVerification = async (email: string, token: string, user?: User, verified?: boolean) => {
        const verificationData = new Verification();
        verificationData.email = email;
        verificationData.token = token;
        if (verified) verificationData.verified = verified;
        if (user) verificationData.user = user;
        return await verificationData.save();
    };

    public updateVerificationStatus = async (status: boolean) => {
        this.verified = status;
        return await this.save();
    };
}
