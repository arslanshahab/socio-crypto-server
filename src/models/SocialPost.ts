import { BaseEntity, Column, Entity, ManyToOne, PrimaryColumn, CreateDateColumn, UpdateDateColumn } from "typeorm";
import { User } from "./User";
import { Campaign } from "./Campaign";
import { BigNumber } from "bignumber.js";
import { BigNumberEntityTransformer } from "../util/transformers";

@Entity()
export class SocialPost extends BaseEntity {
    @PrimaryColumn()
    public id: string;

    @Column({ nullable: false, default: "twitter" })
    public type: string;

    @Column({ type: "varchar", nullable: false, default: 0, transformer: BigNumberEntityTransformer })
    public likes: BigNumber;

    @Column({ type: "varchar", nullable: false, default: 0, transformer: BigNumberEntityTransformer })
    public shares: BigNumber;

    @Column({ type: "varchar", nullable: false, default: 0, transformer: BigNumberEntityTransformer })
    public comments: BigNumber;

    @Column({ nullable: false })
    public participantId: string;

    @ManyToOne((_type) => User, (user) => user.posts, { primary: true })
    user: User;

    @ManyToOne((_type) => Campaign, (campaign) => campaign.posts, { primary: true })
    campaign: Campaign;

    @CreateDateColumn()
    public createdAt: Date;

    @UpdateDateColumn()
    public updatedAt: Date;

    public asV1() {
        return {
            ...this,
            likes: parseFloat(this.likes.toString()),
            shares: parseFloat(this.shares.toString()),
            comments: parseFloat(this.comments.toString()),
        };
    }

    public static newSocialPost(id: string, type: string, participantId: string, user: User, campaign: Campaign) {
        const post = new SocialPost();
        post.id = id;
        post.type = type;
        post.participantId = participantId;
        post.user = user;
        post.campaign = campaign;
        return post;
    }
}
