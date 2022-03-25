import {
    BaseEntity,
    Column,
    Entity,
    OneToMany,
    PrimaryColumn,
    CreateDateColumn,
    UpdateDateColumn,
    OneToOne,
    JoinColumn,
} from "typeorm";
import { User } from "./User";
import { FactorLink } from "./FactorLink";
import { KycStatus } from "src/types";

@Entity()
export class VerificationApplication extends BaseEntity {
    @PrimaryColumn()
    public applicationId: string;

    @Column()
    public status: KycStatus;

    @Column({ nullable: true })
    public reason: string;

    @OneToOne((_type) => User, (user) => user.identityVerification)
    @JoinColumn()
    public user: User;

    @OneToMany((_type) => FactorLink, (factor) => factor.verification)
    public factors: FactorLink[];

    @CreateDateColumn()
    public createdAt: Date;

    @UpdateDateColumn()
    public updatedAt: Date;

    public static async newApplication(data: { id: string; status: KycStatus; user: User; reason: string }) {
        const app = new VerificationApplication();
        app.applicationId = data.id;
        app.status = data.status;
        app.user = data.user;
        app.reason = data.reason;
        return await app.save();
    }

    public async updateStatus(newStatus: KycStatus) {
        if (this.status !== newStatus && this.status !== "APPROVED") {
            this.status = newStatus;
            return await this.save();
        }
        return this;
    }

    public async updateReason(reason: string) {
        this.reason = reason;
        return await this.save();
    }
}
