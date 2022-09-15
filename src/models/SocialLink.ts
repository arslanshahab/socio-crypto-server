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
import { SocialType, TiktokLinkCredentials, TwitterLinkCredentials } from "types.d.ts";
import { decrypt, encrypt } from "../util/crypto";
import BigNumber from "bignumber.js";
import { BN } from "../util";
import { BigNumberEntityTransformer } from "../util/transformers";

@Entity()
export class SocialLink extends BaseEntity {
    @PrimaryGeneratedColumn("uuid")
    public id: string;

    @Column({ nullable: false })
    public type: SocialType;

    @Column({ nullable: true })
    public apiKey: string;

    @Column({ nullable: true })
    public apiSecret: string;

    @Column({ nullable: true })
    public accessToken: string;

    @Column({ nullable: true, type: "varchar", transformer: BigNumberEntityTransformer })
    public accessTokenExpiry: BigNumber;

    @Column({ nullable: true })
    public refreshToken: string;

    @Column({ nullable: true, type: "varchar", transformer: BigNumberEntityTransformer })
    public refreshTokenExpiry: BigNumber;

    @Column({ nullable: true })
    public openId: string;

    @Column({ nullable: true })
    public followerCount: number;

    @ManyToOne((_type) => User, (user) => user.socialLinks)
    public user: User;

    @CreateDateColumn()
    public createdAt: Date;

    @UpdateDateColumn()
    public updatedAt: Date;

    public getTwitterCreds = (): TwitterLinkCredentials => {
        return {
            apiKey: decrypt(this.apiKey),
            apiSecret: decrypt(this.apiSecret),
        };
    };

    public getTiktokCreds = (): TiktokLinkCredentials => {
        return {
            access_token: this.accessToken,
            refresh_token: this.refreshToken,
            open_id: this.openId,
            expires_in: this.accessTokenExpiry,
            refresh_expires_in: this.refreshTokenExpiry,
        };
    };

    public static addTwitterLink = async (user: User, keys: { apiKey: string; apiSecret: string }) => {
        let socialLink = await SocialLink.findOne({ where: { user, type: "twitter" } });
        if (!socialLink) {
            socialLink = new SocialLink();
            socialLink.user = user;
            socialLink.type = "twitter";
        }
        socialLink.apiKey = encrypt(keys.apiKey);
        socialLink.apiSecret = encrypt(keys.apiSecret);
        return await socialLink.save();
    };

    public static addOrUpdateTiktokLink = async (
        user: User,
        tokens: {
            open_id: string;
            access_token: string;
            expires_in: number;
            refresh_token: string;
            refresh_expires_in: number;
        }
    ) => {
        let socialLink = await SocialLink.findOne({ where: { user, type: "tiktok" } });
        if (!socialLink) {
            socialLink = new SocialLink();
            socialLink.user = user;
            socialLink.type = "tiktok";
        }
        socialLink.openId = tokens.open_id;
        socialLink.accessToken = tokens.access_token;
        socialLink.accessTokenExpiry = new BN(tokens.expires_in * 1000).plus(new Date().getTime());
        socialLink.refreshToken = tokens.refresh_token;
        socialLink.refreshTokenExpiry = new BN(tokens.refresh_expires_in * 1000).plus(new Date().getTime());
        return await socialLink.save();
    };
}
