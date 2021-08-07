import {
    PrimaryGeneratedColumn,
    Entity,
    BaseEntity,
    CreateDateColumn,
    UpdateDateColumn,
    ManyToOne,
    Column,
    OneToOne,
    JoinColumn,
} from "typeorm";
import { User } from "./User";
import { Participant } from "./Participant";

@Entity()
export class WeeklyReward extends BaseEntity {
    @PrimaryGeneratedColumn("uuid")
    public id: string;

    @Column({ nullable: false })
    public coiinAmount: string;

    @Column({ nullable: false })
    public week: string;

    @Column({ nullable: false })
    public rewardType: string;

    @ManyToOne((_type) => User, (user) => user.weeklyRewards)
    public user: User;

    @OneToOne((_type) => Participant, (participant) => participant.reward)
    @JoinColumn()
    public participant: Participant;

    @CreateDateColumn()
    public createdAt: Date;

    @UpdateDateColumn()
    public updatedAt: Date;

    public asV1(): WeeklyReward {
        return {
            ...this,
            user: this.user.asV1(),
        };
    }

    public static async addReward(data: any): Promise<WeeklyReward> {
        let reward = new WeeklyReward();
        reward.coiinAmount = data.amount.toString();
        reward.week = data.week;
        reward.rewardType = data.type;
        reward.user = data.user;
        reward.participant = data.participant;
        return await WeeklyReward.save(reward);
    }
}
