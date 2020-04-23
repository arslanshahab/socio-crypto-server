import {BaseEntity, Column, Entity, ManyToOne, PrimaryColumn } from "typeorm";
import {User} from "./User";
import {Campaign} from "./Campaign";


@Entity()
export class SocialPost extends BaseEntity{
    @PrimaryColumn()
    public id: string;

    @Column({nullable: false, default: 'twitter'})
    public type: string;

    @Column({nullable: false, default: 0})
    public likes: number;

    @Column({nullable: false, default: 0})
    public shares: number;

    @Column({nullable: false, default: 0})
    public comments: number;

    @Column({nullable: false})
    public participantId: string;

    @ManyToOne(
        _type => User,
        user => user.posts,
        { primary: true }
    )
    user: User;

    @ManyToOne(
        _type => Campaign,
        campaign => campaign.posts,
        { primary: true }
    )
    campaign: Campaign;

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


