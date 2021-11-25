import {BaseEntity, Column, Entity, ManyToOne, OneToMany, PrimaryColumn} from "typeorm";
import {User} from "./User";
import {FactorLink} from "./FactorLink";
import {Factor} from "../types";


@Entity()
export class VerificationApplication extends BaseEntity {
    @PrimaryColumn()
    public applicationId: string;

    @Column()
    public status: string;

    @ManyToOne(
        _type => User,
        user => user.identityVerifications
    )
    public user: User;

    @OneToMany(
        _type => FactorLink,
        factor => factor.verification
    )
    public factors: FactorLink[];

    public static newApplication(id: string, status: string, user: User, factors?: Factor[]) {
        const app = new VerificationApplication();
        app.applicationId = id;
        app.status = status;
        app.user = user;
        return app;
    }
}