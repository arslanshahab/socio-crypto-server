import { Campaign } from "../models/Campaign";
import { Participant } from "../models/Participant";
import { checkPermissions } from "../middleware/authentication";
import { FirebaseMobile } from "../clients/firebaseMobile";
import { User } from "../models/User";
import { S3Client } from "../clients/s3";
import { decrypt, sha256Hash } from "../util/crypto";
import { GraphQLResolveInfo } from "graphql";
import { Profile } from "../models/Profile";
import { DailyParticipantMetric } from "../models/DailyParticipantMetric";
import { groupDailyMetricsByUser } from "./helpers";
import { HourlyCampaignMetric } from "../models/HourlyCampaignMetric";
import { In } from "typeorm";
import { createPasswordHash, getCryptoAssestImageUrl, formatFloat, getMinWithdrawableAmount } from "../util";
import { TatumClient } from "../clients/tatumClient";
import { Currency } from "../models/Currency";
import { flatten } from "lodash";
import { Verification } from "../models/Verification";
import { SesClient } from "../clients/ses";
import {
    USER_NOT_FOUND,
    INCORRECT_PASSWORD,
    FormattedError,
    SAME_OLD_AND_NEW_PASSWORD,
    CAMPAIGN_NOT_FOUND,
    MISSING_PARAMS,
    CAMPAIGN_CLOSED,
    USERNAME_EXISTS,
    PARTICIPANT_NOT_FOUND,
    PROFILE_NOT_FOUND,
    NOTIFICATION_SETTING_NOT_FOUND,
    EMAIL_EXISTS,
    INVALID_TOKEN,
    ALREADY_PARTICIPATING,
    GLOBAL_CAMPAIGN_NOT_FOUND,
} from "../util/errors";
import { addDays, endOfISOWeek, startOfDay } from "date-fns";
import { Transfer } from "../models/Transfer";
import { BSC, COIIN, RAIINMAKER_ORG_NAME, TransferAction, UserRewardType } from "../util/constants";
import { JWTPayload } from "types.d.ts";
import { SHARING_REWARD_AMOUNT } from "../util/constants";
import { NotificationSettings } from "../models/NotificationSettings";
import { getTokenValueInUSD } from "../util/exchangeRate";

export const participate = async (
    parent: any,
    args: { campaignId: string; email: string },
    context: { user: any }
): Promise<Participant> => {
    try {
        const user = await User.findUserByContext(context.user, ["wallet"]);
        if (!user) throw new Error(USER_NOT_FOUND);
        const campaign = await Campaign.findOne({
            where: { id: args.campaignId },
            relations: ["org", "currency", "currency.token"],
        });
        if (!campaign) throw new Error(CAMPAIGN_NOT_FOUND);
        if (campaign.type === "raffle" && !args.email) throw new Error(MISSING_PARAMS);
        if (!campaign.isOpen()) throw new Error(CAMPAIGN_CLOSED);

        if (await Participant.findOne({ where: { campaign, user } })) throw new Error(ALREADY_PARTICIPATING);
        await TatumClient.findOrCreateCurrency({ ...campaign.currency.token, walletId: user.wallet.id });
        const participant = await Participant.createNewParticipant(user, campaign, args.email);
        if (!campaign.isGlobal) await user.transferCoiinReward({ type: UserRewardType.PARTICIPATION_REWARD, campaign });
        return await participant.asV2();
    } catch (error) {
        throw new FormattedError(error);
    }
};

export const promotePermissions = async (
    parent: any,
    args: {
        userId: string;
        email: string;
        company: string;
        role: "admin" | "manager";
    },
    context: { user: any }
) => {
    const { role, company } = checkPermissions({ hasRole: ["admin", "manager"] }, context);
    const where: { [key: string]: string } = {};
    if (args.userId) where["id"] = args.userId;
    else if (args.email) where["email"] = args.email;
    else throw new Error(MISSING_PARAMS);
    const user = await User.findOne({ where });
    if (!user) throw new Error(USER_NOT_FOUND);
    if (role === "manager") {
        await FirebaseMobile.adminClient.auth().setCustomUserClaims(user.id, { role: "manager", company });
    } else {
        if (!args.role) throw new Error(MISSING_PARAMS);
        await FirebaseMobile.adminClient.auth().setCustomUserClaims(user.id, {
            role: args.role,
            company: args.company || company,
        });
    }
    return user.asV1();
};

export const removeParticipation = async (parent: any, args: { campaignId: string }, context: { user: any }) => {
    const user = await await User.findUserByContext(context.user, ["campaigns", "wallet"]);
    if (!user) throw new Error(USER_NOT_FOUND);
    const campaign = await Campaign.findOne({
        where: { id: args.campaignId },
        relations: ["org"],
    });
    if (!campaign) throw new Error(CAMPAIGN_NOT_FOUND);
    const participation = await Participant.findOne({
        where: { user, campaign },
    });
    if (!participation) throw new Error(PARTICIPANT_NOT_FOUND);
    await HourlyCampaignMetric.upsertData(campaign, campaign.org, "removeParticipant");
    await participation.remove();
    return user.asV1();
};

export const usernameExists = async (parent: any, args: { username: string }) => {
    const profile = await Profile.findOne({
        where: { username: args.username },
    });
    return { exists: !!profile };
};

export const accountExists = async (parent: any, args: { id: string }) => {
    const user = await User.findOne({ id: args.id });
    return { exists: !!user };
};

export const me = async (
    parent: any,
    args: { openCampaigns?: boolean } = {},
    context: { user: any },
    info: GraphQLResolveInfo
) => {
    const { id, userId } = context.user;
    const query = info.fieldNodes.find((field) => field.name.value === info.fieldName);
    const user = await User.getUser({ identityId: id, userId }, query);
    if (!user) throw new Error(USER_NOT_FOUND);
    if (args.openCampaigns !== null && args.openCampaigns === true) {
        user.campaigns = user.campaigns.filter((p) => p.campaign.isOpen());
    } else if (args.openCampaigns !== null && args.openCampaigns === false) {
        user.campaigns = user.campaigns.filter((p) => !p.campaign.isOpen());
    }
    return await user.asV2({ loadParticipantModel: true });
};

export const meV2 = async (parent: any, args: any, context: { user: JWTPayload }, info: GraphQLResolveInfo) => {
    let user = await User.findUserByContext(context.user, ["profile", "socialLinks", "identityVerification"]);
    if (!user) throw new Error(USER_NOT_FOUND);
    user = await user.asV2({ loadParticipantModel: false });
    const participations = await Participant.find({ where: { user }, relations: ["campaign"] });
    return {
        ...user,
        participations: participations.map((item) => {
            return {
                participantId: item.id,
                campaignId: item.campaign.id,
                currentlyParticipating: item.campaign.isOpen(),
                link: item.link || "",
            };
        }),
    };
};

export const list = async (parent: any, args: { skip: number; take: number }, context: { user: any }) => {
    checkPermissions({ hasRole: ["admin"] }, context);
    const { skip = 0, take = 10 } = args;
    const [results, total] = await User.findAndCount({ skip, take });
    return { results: results.map((user) => user.asV1()), total };
};

export const setDevice = async (parent: any, args: { deviceToken: string }, context: { user: any }) => {
    const { deviceToken } = args;
    const user = await User.findUserByContext(context.user);
    if (!user) throw new Error(USER_NOT_FOUND);
    user.profile.deviceToken = deviceToken;
    await user.profile.save();
    return true;
};

export const updateUsername = async (parent: any, args: { username: string }, context: { user: any }) => {
    const user = await User.findUserByContext(context.user);
    if (!user) throw new Error(USER_NOT_FOUND);
    if (await Profile.findOne({ where: { username: args.username } })) throw new Error(USERNAME_EXISTS);
    user.profile.username = args.username;
    await user.profile.save();
    return user.asV1();
};

export const setRecoveryCode = async (parent: any, args: { code: number }, context: { user: any }) => {
    const user = await User.findUserByContext(context.user, ["profile"]);
    if (!user) throw new Error(USER_NOT_FOUND);
    user.profile.recoveryCode = sha256Hash(args.code.toString());
    await user.profile.save();
    return user.asV1();
};

export const updateProfileInterests = async (
    parent: any,
    args: {
        ageRange: string;
        city: string;
        state: string;
        country: string;
        interests: string[];
        values: string[];
    },
    context: { user: any }
) => {
    const { ageRange, city, state, interests, values, country } = args;
    const user = await User.findUserByContext(context.user);
    if (!user) throw new Error(USER_NOT_FOUND);
    const profile = user.profile;
    if (ageRange) profile.ageRange = ageRange;
    if (city) profile.city = city;
    if (state) profile.state = state;
    if (country) profile.country = country;
    if (interests) profile.interests = interests;
    if (values) profile.values = values;
    await profile.save();
    return user.asV1();
};

export const removeProfileInterests = async (
    parent: any,
    args: {
        interest: string;
        value: string;
        ageRange: string;
        city: string;
        state: string;
        country: string;
    },
    context: { user: any }
) => {
    const { interest, value, ageRange, city, state, country } = args;
    const user = await User.findUserByContext(context.user, ["profile"]);
    if (!user) throw new Error(USER_NOT_FOUND);
    const profile = await Profile.findOne({ where: { user } });
    if (!profile) throw new Error(PROFILE_NOT_FOUND);
    if (ageRange) profile.ageRange = null;
    if (city) profile.city = null;
    if (state) profile.state = null;
    if (country) profile.country = null;
    if (interest) {
        const index = profile.interests.indexOf(interest);
        if (index > -1) profile.interests.splice(index, 1);
    }
    if (value) {
        const index = profile.values.indexOf(value);
        if (index > -1) profile.values.splice(index, 1);
    }
    await profile.save();
    return user.asV1();
};

export const getUserMetrics = async (parent: any, args: { today: boolean }, context: { user: any }) => {
    const { today = false } = args;
    const user = await User.findUserByContext(context.user);
    if (!user) throw new Error(USER_NOT_FOUND);
    return (await DailyParticipantMetric.getSortedByUser(user, today)).map((metric) => metric.asV1());
};

export const getUserParticipationKeywords = async (parent: any, args: { id: string }, context: { user: any }) => {
    const user = await User.findUserByContext(context.user);
    if (!user) throw new Error(USER_NOT_FOUND);
    const participations = await Participant.find({
        where: { user: user },
        relations: ["campaign"],
    });
    if (!participations) return [];
    let keywordsArray: String[][] = [];
    participations.forEach((item) => {
        keywordsArray.push(item.campaign.keywords);
    });
    return [...new Set(flatten(keywordsArray))];
};

export const getPreviousDayMetrics = async (_parent: any, args: any, context: { user: any }) => {
    let metrics: { [key: string]: any } = {};
    const user = await User.findUserByContext(context.user, ["campaigns", "campaigns.campaign"]);
    if (!user) throw new Error(USER_NOT_FOUND);
    if (user.campaigns.length > 0) {
        for (let i = 0; i < user.campaigns.length; i++) {
            const participant = user.campaigns[i];
            await Campaign.updateAllDailyParticipationMetrics(participant.campaign.id);
        }
        const allParticipatingCampaigns = [...user.campaigns].map((participant) => participant.campaign.id);
        const allDailyMetrics =
            allParticipatingCampaigns.length > 0
                ? await DailyParticipantMetric.getPreviousDayMetricsForAllCampaigns(allParticipatingCampaigns)
                : [];
        metrics = await groupDailyMetricsByUser(user.id, allDailyMetrics);
    }
    return metrics;
};

export const getNotificationSettings = async (parent: any, args: any, context: { user: any }) => {
    const user = await User.findUserByContext(context.user);
    if (!user) throw new Error();
    const settings = await NotificationSettings.findOne({ where: { user } });
    if (!settings) throw new Error(NOTIFICATION_SETTING_NOT_FOUND);
    return settings;
};

export const updateNotificationSettings = async (
    parent: any,
    args: {
        kyc: boolean;
        withdraw: boolean;
        campaignCreate: boolean;
        campaignUpdates: boolean;
    },
    context: { user: any }
) => {
    const { kyc, withdraw, campaignCreate, campaignUpdates } = args;
    const user = await User.findUserByContext(context.user, ["notificationSettings"]);
    if (!user) throw new Error(USER_NOT_FOUND);
    const notificationSettings = user.notificationSettings;
    if (kyc !== null && kyc !== undefined) notificationSettings.kyc = kyc;
    if (withdraw !== null && withdraw !== undefined) notificationSettings.withdraw = withdraw;
    if (campaignCreate !== null && campaignCreate !== undefined) notificationSettings.campaignCreate = campaignCreate;
    if (campaignUpdates !== null && campaignUpdates !== undefined)
        notificationSettings.campaignUpdates = campaignUpdates;
    await notificationSettings.save();
    return user.asV1();
};

export const sendUserMessages = async (
    parent: any,
    args: { usernames: string[]; title: string; message: string },
    context: { user: any }
) => {
    checkPermissions({ hasRole: ["admin"], restrictCompany: RAIINMAKER_ORG_NAME }, context);
    const { usernames, title, message } = args;
    if (usernames.length === 0) return false;
    const tokens = (await Profile.find({ where: { username: In(usernames) } })).reduce(
        (accum: string[], curr: Profile) => {
            if (curr.deviceToken) accum.push(curr.deviceToken);
            return accum;
        },
        []
    );
    await FirebaseMobile.sendGenericNotification(tokens, title, message);
    return true;
};

export const uploadProfilePicture = async (parent: any, args: { image: string }, context: { user: any }) => {
    const { image } = args;
    const user = await await User.findUserByContext(context.user);
    if (!user) throw new Error(USER_NOT_FOUND);
    const filename = await S3Client.uploadProfilePicture("profilePicture", user.id, image);
    user.profile.profilePicture = filename;
    user.profile.save();
    return true;
};

export const getWalletBalances = async (parent: any, args: any, context: { user: any }) => {
    const user = await User.findUserByContext(context.user, ["wallet"]);
    if (!user) throw new Error(USER_NOT_FOUND);
    const currencies = await Currency.find({ where: { wallet: user.wallet }, relations: ["token"] });
    const balances = await TatumClient.getBalanceForAccountList(currencies);
    let allCurrencies = currencies.map(async (currencyItem) => {
        const balance = balances.find((balanceItem) => currencyItem.tatumId === balanceItem.tatumId);
        const symbol = currencyItem.token.symbol;
        return {
            balance: formatFloat(balance.availableBalance),
            availableBalance: formatFloat(balance.availableBalance),
            symbol: symbol,
            minWithdrawAmount: getMinWithdrawableAmount(symbol),
            usdBalance: getTokenValueInUSD(symbol.toLowerCase(), balance.availableBalance),
            imageUrl: getCryptoAssestImageUrl(symbol),
            network: currencyItem.token.network,
        };
    });
    return allCurrencies;
};

// export const getWalletBalances = async (parent: any, args: any, context: { user: any }) => {
//     const user = await User.findUserByContext(context.user, ["wallet"]);
//     if (!user) throw new Error(USER_NOT_FOUND);
//     const currencies = await Currency.find({ where: { wallet: user.wallet }, relations: ["token"] });
//     let allCurrencies = currencies.map(async (currencyItem) => {
//         const symbol = currencyItem.token.symbol;
//         const pendingBalance = await Transfer.getPendingWalletBalances(user.wallet.id, symbol);
//         const balance = (currencyItem.availableBalance + pendingBalance).toString();
//         return {
//             balance: formatFloat(balance),
//             availableBalance: formatFloat(balance),
//             symbol: symbol,
//             minWithdrawAmount: getMinWithdrawableAmount(symbol),
//             usdBalance: formatFloat(await getTokenValueInUSD(symbol.toLowerCase(), parseFloat(balance))),
//             imageUrl: getCryptoAssestImageUrl(symbol),
//             network: currencyItem.token.network,
//         };
//     });
//     return allCurrencies;
// };

export const updateUserPassword = async (
    parent: any,
    args: { oldPassword: string; newPassword: string },
    context: { user: any }
) => {
    try {
        const user = await User.findUserByContext(context.user);
        if (!user) throw new Error(USER_NOT_FOUND);
        const { oldPassword, newPassword } = args;
        if (createPasswordHash({ email: user.email, password: oldPassword }) !== user.password)
            throw new Error(INCORRECT_PASSWORD);
        if (
            createPasswordHash({ email: user.email, password: oldPassword }) ===
            createPasswordHash({ email: user.email, password: newPassword })
        )
            throw new Error(SAME_OLD_AND_NEW_PASSWORD);
        user.password = createPasswordHash({ email: user.email, password: newPassword });
        await user.save();
        return { success: true };
    } catch (error) {
        throw new FormattedError(error);
    }
};

export const startEmailVerification = async (parent: any, args: { email: string }, context: { user: any }) => {
    try {
        const { email } = args;
        const user = await User.findUserByContext(context.user, ["profile"]);
        if (!user) throw new Error(USER_NOT_FOUND);
        if (!email) throw new Error(MISSING_PARAMS);
        if (user.profile.email === email) throw new Error(EMAIL_EXISTS);
        let verificationData = await Verification.generateVerification({ email, type: "EMAIL" });
        await SesClient.emailAddressVerificationEmail(email, verificationData.getDecryptedCode());
        return {
            success: true,
            message: "Email sent to provided email address",
        };
    } catch (error) {
        throw new FormattedError(error);
    }
};

export const completeEmailVerification = async (
    parent: any,
    args: { email: string; token: string },
    context: { user: any }
) => {
    try {
        const { email, token } = args;
        const user = await User.findUserByContext(context.user, ["profile"]);
        if (!user) throw new Error(USER_NOT_FOUND);
        if (!email || !token) throw new Error(MISSING_PARAMS);
        if ((await User.findOne({ where: { email } })) || (await Profile.findOne({ where: { email } })))
            throw new Error(EMAIL_EXISTS);
        const verificationData = await Verification.findOne({ where: { email, verified: false } });
        if (!verificationData || decrypt(verificationData.code) !== token) throw new Error(INVALID_TOKEN);
        await user.updateEmail(email);
        await verificationData.updateVerificationStatus(true);
        return {
            success: true,
            message: "Email address verified",
        };
    } catch (error) {
        throw new FormattedError(error);
    }
};

export const getWeeklyRewardEstimation = async (parent: any, args: any, context: any) => {
    try {
        const user = await User.findUserByContext(context.user, ["wallet"]);
        if (!user) throw new Error(USER_NOT_FOUND);
        const loginReward = await Transfer.getRewardForThisWeek(user.wallet, TransferAction.LOGIN_REWARD);
        const participationReward = await Transfer.getRewardForThisWeek(
            user.wallet,
            TransferAction.PARTICIPATION_REWARD
        );
        const nextReward = startOfDay(addDays(endOfISOWeek(user.lastLogin), 1));
        const coiinEarnedToday = await Transfer.getCoinnEarnedToday(user.wallet);
        return {
            loginRewardRedeemed: Boolean(loginReward),
            loginReward: parseInt(loginReward?.amount?.toString() || "0"),
            nextLoginReward: nextReward.toString(),
            participationReward: parseInt(participationReward?.amount?.toString() || "0"),
            participationId: "",
            nextParticipationReward: nextReward.toString(),
            participationRewardRedeemed: Boolean(participationReward),
            participationRedemptionDate: participationReward?.createdAt?.toString() || "",
            loginRedemptionDate: loginReward?.createdAt?.toString() || "",
            earnedToday: coiinEarnedToday || 0,
            sharingReward: SHARING_REWARD_AMOUNT,
            sharingRewardType: COIIN,
        };
    } catch (e) {
        throw new FormattedError(e);
    }
};

export const rewardUserForSharing = async (
    parent: any,
    args: { participantId: string; isGlobal: boolean },
    context: any
) => {
    try {
        const user = await User.findUserByContext(context.user, ["wallet"]);
        if (!user) throw new Error(USER_NOT_FOUND);
        let participant;
        let campaign;
        if (args.isGlobal) {
            const globalCampaign = await Campaign.findOne({
                where: { isGlobal: true, symbol: COIIN },
                relations: ["org"],
            });
            if (!globalCampaign) throw new Error(GLOBAL_CAMPAIGN_NOT_FOUND);
            campaign = globalCampaign;
            participant = await Participant.findOne({
                where: { user, campaign: globalCampaign },
                relations: ["campaign"],
            });
            if (!participant) {
                await TatumClient.findOrCreateCurrency({ symbol: COIIN, network: BSC, walletId: user.wallet.id });
                participant = await Participant.createNewParticipant(user, globalCampaign, user.email);
            }
        } else {
            participant = await Participant.findOne({
                where: { id: args.participantId, user },
                relations: ["campaign"],
            });
            if (!participant) throw new Error(PARTICIPANT_NOT_FOUND);
            campaign = participant.campaign;
        }
        if (!participant) throw new Error(PARTICIPANT_NOT_FOUND);
        await user.transferCoiinReward({ campaign, type: UserRewardType.SHARING_REWARD });
        return { success: true };
    } catch (error) {
        throw new FormattedError(error);
    }
};
