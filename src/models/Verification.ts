import { VerificationType } from "src/types";
import { BaseEntity, Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn } from "typeorm";

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

    @Column({ nullable: false, default: "" })
    public type: VerificationType;

    @CreateDateColumn()
    public createdAt: Date;

    @UpdateDateColumn()
    public updatedAt: Date;

    public static createVerification = async (
        email: string,
        token: string,
        type: VerificationType,
        verified?: boolean
    ) => {
        const verificationData = new Verification();
        verificationData.email = email;
        verificationData.token = token;
        verificationData.type = type;
        if (verified) verificationData.verified = verified;
        return await verificationData.save();
    };

    public updateVerificationStatus = async (status: boolean) => {
        this.verified = status;
        return await this.save();
    };
}
