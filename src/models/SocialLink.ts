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
import { SocialType, TiktokLinkCredentials, TwitterLinkCredentials } from "../types";
import { decrypt, encrypt } from "../util/crypto";

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

    @Column({ nullable: true })
    public accessTokenExpiry: number;

    @Column({ nullable: true })
    public refreshToken: string;

    @Column({ nullable: true })
    public refreshTokenExpiry: number;

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

    public static addTwitterLink = async (user: User, keys: TwitterLinkCredentials) => {
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

    public static addTiktokLink = async (user: User, tokens: TiktokLinkCredentials) => {
        let socialLink = await SocialLink.findOne({ where: { user, type: "tiktok" } });
        if (!socialLink) {
            socialLink = new SocialLink();
            socialLink.user = user;
            socialLink.type = "tiktok";
        }
        socialLink.openId = tokens.open_id;
        socialLink.accessToken = tokens.access_token;
        socialLink.accessTokenExpiry = tokens.expires_in * 1000 + new Date().getTime();
        socialLink.refreshToken = tokens.refresh_token;
        socialLink.refreshTokenExpiry = tokens.refresh_expires_in * 1000;
        return await socialLink.save();
    };
}
