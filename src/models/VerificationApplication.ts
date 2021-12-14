import { BaseEntity, Column, Entity, ManyToOne, OneToMany, PrimaryColumn } from "typeorm";
import { User } from "./User";
import { FactorLink } from "./FactorLink";
import { KycStatus } from "src/types";

@Entity()
export class VerificationApplication extends BaseEntity {
    @PrimaryColumn()
    public applicationId: string;

    @Column()
    public status: KycStatus;

    @ManyToOne((_type) => User, (user) => user.identityVerifications)
    public user: User;

    @OneToMany((_type) => FactorLink, (factor) => factor.verification)
    public factors: FactorLink[];

    public static async newApplication(id: string, status: KycStatus, user: User) {
        const app = new VerificationApplication();
        app.applicationId = id;
        app.status = status;
        app.user = user;
        return await app.save();
    }

    public async updateStatus(newStatus: KycStatus) {
        if (this.status !== newStatus && this.status !== "APPROVED") {
            this.status = newStatus;
            return await this.save();
        }
        return this;
    }
}
