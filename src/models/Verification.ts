import { BaseEntity, Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn } from "typeorm";
import { decrypt, encrypt } from "../util/crypto";
import { generateRandomNonce } from "../util/helpers";
@Entity()
export class Verification extends BaseEntity {
    @PrimaryGeneratedColumn("uuid")
    public id: string;

    @Column({
        nullable: false,
        transformer: { to: (value: string) => value, from: (value: string) => value },
    })
    public email: string;

    @Column({ nullable: false, default: false })
    public verified: boolean;

    @Column({ nullable: false })
    public code: string;

    @CreateDateColumn()
    public createdAt: Date;

    @UpdateDateColumn()
    public updatedAt: Date;

    public static createVerification = async (email: string) => {
        const verificationData = new Verification();
        verificationData.email = email;
        verificationData.code = encrypt(generateRandomNonce());
        return await verificationData.save();
    };

    public updateVerificationStatus = async (status: boolean) => {
        this.verified = status;
        return await this.save();
    };

    public getDecryptedCode = () => {
        return decrypt(this.code);
    };
}
