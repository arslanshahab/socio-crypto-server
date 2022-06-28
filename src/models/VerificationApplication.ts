import {
    BaseEntity,
    Column,
    Entity,
    OneToMany,
    PrimaryGeneratedColumn,
    CreateDateColumn,
    UpdateDateColumn,
    ManyToOne,
} from "typeorm";
import { User } from "./User";
import { FactorLink } from "./FactorLink";
import { KycStatus } from "src/types";
import { KycLevel } from "../util/constants";

@Entity()
export class VerificationApplication extends BaseEntity {
    @PrimaryGeneratedColumn("uuid")
    public id: string;

    @Column()
    public applicationId: string;

    @Column({ type: "enum", enum: KycLevel, default: KycLevel.LEVEL1 })
    public level: KycLevel;

    @Column({ nullable: true })
    public profile: string;

    @Column()
    public status: KycStatus;

    @Column({ nullable: true })
    public reason: string;

    @ManyToOne((_type) => User, (user) => user.identityVerification)
    public user: User;

    @OneToMany((_type) => FactorLink, (factor) => factor.verification)
    public factors: FactorLink[];

    @CreateDateColumn()
    public createdAt: Date;

    @UpdateDateColumn()
    public updatedAt: Date;

    public static async upsert(data: {
        record?: VerificationApplication;
        appId: string;
        status: KycStatus;
        user: User;
        reason: string;
    }) {
        let app = await VerificationApplication.findOne({ where: { id: data.record?.id } });
        if (!app) {
            app = new VerificationApplication();
        }
        app.applicationId = data.appId;
        app.status = data.status;
        app.user = data.user;
        app.reason = data.reason;
        return await app.save();
    }

    public async updateAppId(appId: string) {
        this.applicationId = appId;
        return await this.save();
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
