import {
    BaseEntity,
    Entity,
    PrimaryGeneratedColumn,
    Column,
    CreateDateColumn,
    UpdateDateColumn,
    BeforeInsert,
} from "typeorm";
import { decrypt, encrypt } from "../util/crypto";
import { generate6DigitCode } from "../util";
import { EMAIL_NOT_VERIFIED, INCORRECT_CODE_OR_EMAIL, INVALID_VERIFICATION_TOKEN } from "../util/errors";
import { addMinutes, isPast } from "date-fns";
import { VerificationType } from "types.d.ts";
@Entity()
export class Verification extends BaseEntity {
    @PrimaryGeneratedColumn("uuid")
    public id: string;

    @Column({ nullable: false })
    public email: string;

    @Column({ nullable: false, default: false })
    public verified: boolean;

    @Column({ nullable: true })
    public expiry: Date;

    @Column({ nullable: false })
    public code: string;

    @Column({ nullable: true, default: "" })
    public type: VerificationType;

    @CreateDateColumn()
    public createdAt: Date;

    @UpdateDateColumn()
    public updatedAt: Date;

    @BeforeInsert()
    nameToUpperCase() {
        this.email = this.email ? this.email.toLowerCase() : this.email;
    }

    public updateVerificationStatus = async (status: boolean) => {
        this.verified = status;
        return await this.save();
    };

    public getDecryptedCode = () => {
        return decrypt(this.code);
    };

    public generateToken = () => {
        return encrypt(this.id);
    };

    public isCodeExpired = () => {
        return !this.expiry ? false : isPast(new Date(this.expiry));
    };

    public addExpiryTime = async () => {
        this.expiry = addMinutes(new Date(), 60);
        return await this.save();
    };

    public expireToken = async () => {
        this.expiry = new Date();
        return await this.save();
    };

    public static generateVerification = async (data: { email: string; type: VerificationType }) => {
        let verification = await Verification.findOne({ where: { email: data.email, verified: false } });
        if (!verification) {
            verification = new Verification();
            verification.email = data.email;
            verification.type = data.type;
            verification.code = encrypt(generate6DigitCode());
            return await verification.save();
        }
        return verification;
    };

    public static verifyCode = async (data: { code: string; email: string }) => {
        const verification = await Verification.findOne({
            where: { email: data.email, verified: false },
        });
        if (!verification || data.code !== decrypt(verification.code)) throw new Error(INCORRECT_CODE_OR_EMAIL);
        await verification.addExpiryTime();
        return await verification.updateVerificationStatus(true);
    };

    public static verifyToken = async (data: { verificationToken: string; email?: string }) => {
        const verification = await Verification.findOne({
            where: { id: decrypt(data.verificationToken), verified: true },
        });
        if (!verification) throw new Error(EMAIL_NOT_VERIFIED);
        if (data.email && data.email.toLowerCase() !== verification.email) throw new Error(EMAIL_NOT_VERIFIED);
        if (verification.isCodeExpired()) throw new Error(INVALID_VERIFICATION_TOKEN);
        await verification.expireToken();
        return verification;
    };
}
