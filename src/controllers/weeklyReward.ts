import { endOfISOWeek, getWeek, getYear, addDays, startOfDay } from "date-fns";
import { User } from "../models/User";
import { WeeklyReward } from "../models/WeeklyReward";

interface RewardResponse {
    loginRewardRedeemed: boolean;
    loginReward: number;
    nextLoginReward: string;
    participationReward: number;
    participationId: string;
    nextParticipationReward: string;
    participationRewardRedeemed: boolean;
    participationRedemptionDate: string;
    loginRedemptionDate: string;
}

export const getWeeklyRewards = async (parent: any, args: any, context: any) => {
    try {
        const { id } = context.user;
        const user = await User.findOne({
            where: { identityId: id },
            relations: ["weeklyRewards", "weeklyRewards.participant"],
        });
        if (!user) throw new Error("user not found");
        const weekKey = `${getWeek(user.lastLogin)}-${getYear(user.lastLogin)}`;
        const rewards = user.weeklyRewards.filter((item) => item.week === weekKey);
        const data = await prepareWeeklyRewardResponse(user, rewards);
        console.log(data);
        return data;
    } catch (e) {
        console.log(e);
        return null;
    }
};

const prepareWeeklyRewardResponse = async (user: User, data: WeeklyReward[]): Promise<RewardResponse> => {
    const loginReward = data.find((item) => item.rewardType === "login");
    const participationReward = data.find((item) => item.rewardType === "campaign-participation");
    const nextReward = startOfDay(addDays(endOfISOWeek(user.lastLogin), 1));
    return {
        loginRewardRedeemed: loginReward ? true : false,
        loginReward: loginReward ? parseInt(loginReward.coiinAmount) : 0,
        nextLoginReward: nextReward.toString(),
        participationReward: participationReward ? parseInt(participationReward.coiinAmount) : 0,
        participationId: participationReward ? participationReward.participant.id : "",
        nextParticipationReward: nextReward.toString(),
        participationRewardRedeemed: participationReward ? true : false,
        participationRedemptionDate: participationReward ? participationReward.createdAt.toString() : "",
        loginRedemptionDate: loginReward ? loginReward.createdAt.toString() : "",
    };
};
