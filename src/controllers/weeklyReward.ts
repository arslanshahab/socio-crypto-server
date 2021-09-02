import { endOfISOWeek, getWeek, getYear, addDays, startOfDay } from "date-fns";
import { User } from "../models/User";
import { WeeklyReward } from "../models/WeeklyReward";
import { Participant } from "../models/Participant";

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
const loginCoiinReward = 1;
const participationCoiinReward = 2;

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
        return data;
    } catch (e) {
        console.log(e);
        return null;
    }
};

export const rewardUserForLogin = async (user: User): Promise<any> => {
    const weekKey = `${getWeek(user.lastLogin)}-${getYear(user.lastLogin)}`;
    const thisWeeksReward = await WeeklyReward.findOne({
        where: { user: user, rewardType: "login", week: weekKey },
    });
    if (!thisWeeksReward) {
        await user.updateCoiinBalance("add", loginCoiinReward);
        await WeeklyReward.addReward({
            type: "login",
            amount: loginCoiinReward,
            week: weekKey,
            user: user,
            participant: null,
        });
    }
};

export const rewardUserForParticipation = async (user: User, participant: Participant): Promise<any> => {
    const weekKey = `${getWeek(user.lastLogin)}-${getYear(user.lastLogin)}`;
    const participationReward = await WeeklyReward.findOne({
        where: { user: user, rewardType: "campaign-participation", week: weekKey },
    });
    if (!participationReward) {
        await user.updateCoiinBalance("add", participationCoiinReward);
        await WeeklyReward.addReward({
            type: "campaign-participation",
            amount: participationCoiinReward,
            week: weekKey,
            participant: participant,
            user: user,
        });
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
