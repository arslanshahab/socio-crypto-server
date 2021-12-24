import {
    BaseEntity,
    Entity,
    PrimaryGeneratedColumn,
    Column,
    CreateDateColumn,
    UpdateDateColumn,
    BeforeInsert,
} from "typeorm";

@Entity()
export class Verification extends BaseEntity {
    @PrimaryGeneratedColumn("uuid")
    public id: string;

    @Column({ nullable: false })
    public email: string;

    @Column({ nullable: false, default: false })
    public verified: boolean;

    @Column({ nullable: false })
    public code: string;

    @CreateDateColumn()
    public createdAt: Date;

    @UpdateDateColumn()
    public updatedAt: Date;

    @BeforeInsert()
    prepreModel() {
        this.email = this.email.toLowerCase();
    }

    public static createVerification = async (email: string, code: string, verified?: boolean) => {
        const verificationData = new Verification();
        verificationData.email = email;
        verificationData.code = code;
        if (verified) verificationData.verified = verified;
        return await verificationData.save();
    };

    public updateVerificationStatus = async (status: boolean) => {
        this.verified = status;
        return await this.save();
    };
}
