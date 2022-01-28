import { Campaign } from "../models/Campaign";
import { Participant } from "../models/Participant";
import { checkPermissions } from "../middleware/authentication";
import { Firebase } from "../clients/firebase";
import { User } from "../models/User";
import { S3Client } from "../clients/s3";
import { decrypt, sha256Hash } from "../util/crypto";
import { GraphQLResolveInfo } from "graphql";
import { Profile } from "../models/Profile";
import { DailyParticipantMetric } from "../models/DailyParticipantMetric";
import { groupDailyMetricsByUser } from "./helpers";
import { HourlyCampaignMetric } from "../models/HourlyCampaignMetric";
import { In } from "typeorm";
import {
    createPasswordHash,
    getCryptoAssestImageUrl,
    getMinWithdrawableAmount,
    getUSDValueForCurrency,
    formatFloat,
} from "../util";
import { TatumClient } from "../clients/tatumClient";
import { WalletCurrency } from "../models/WalletCurrency";
import { Wallet } from "../models/Wallet";
import { Currency } from "../models/Currency";
import { flatten } from "lodash";
import { Verification } from "../models/Verification";
import { SesClient } from "../clients/ses";
import { USER_NOT_FOUND, INCORRECT_PASSWORD, FormattedError, SAME_OLD_AND_NEW_PASSWORD } from "../util/errors";
import { addDays, endOfISOWeek, startOfDay } from "date-fns";
import { Transfer } from "../models/Transfer";

export const participate = async (
    parent: any,
    args: { campaignId: string; email: string },
    context: { user: any }
): Promise<Participant> => {
    try {
        const user = await User.findUserByContext(context.user, ["campaigns", "wallet"]);
        if (!user) throw new Error("user not found");
        const campaign = await Campaign.findOne({
            where: { id: args.campaignId },
            relations: ["org"],
        });
        if (!campaign) throw new Error("campaign not found");

        if (campaign.type === "raffle" && !args.email) throw new Error("raffle campaigns require an email");
        if (!campaign.isOpen()) throw new Error("campaign is not open for participation");

        if (await Participant.findOne({ where: { campaign, user } }))
            throw new Error("user already participating in this campaign");

        if (await TatumClient.isCurrencySupported(campaign.symbol)) {
            await TatumClient.findOrCreateCurrency(campaign.symbol, user.wallet);
        }
        const participant = Participant.createNewParticipant(user, campaign, args.email);
        if (!campaign.isGlobal) await user.transferReward("PARTICIPATION_REWARD");
        return participant;
    } catch (e) {
        console.log(e);
        throw new Error(e.message);
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
    else throw new Error("Either userId or email must be provided");
    const user = await User.findOne({ where });
    if (!user) throw new Error("user not found");
    if (role === "manager") {
        await Firebase.adminClient.auth().setCustomUserClaims(user.id, { role: "manager", company });
    } else {
        if (!args.role) throw new Error("administrators must specify a role to promote user to");
        await Firebase.adminClient.auth().setCustomUserClaims(user.id, {
            role: args.role,
            company: args.company || company,
        });
    }
    return user.asV1();
};

export const removeParticipation = async (parent: any, args: { campaignId: string }, context: { user: any }) => {
    const user = await await User.findUserByContext(context.user, ["campaigns", "wallet"]);
    if (!user) throw new Error("user not found");
    const campaign = await Campaign.findOne({
        where: { id: args.campaignId },
        relations: ["org"],
    });
    if (!campaign) throw new Error("campaign not found");
    const participation = await Participant.findOne({
        where: { user, campaign },
    });
    if (!participation) throw new Error("user was not participating in campaign");
    await HourlyCampaignMetric.upsert(campaign, campaign.org, "removeParticipant");
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
    if (!user) throw new Error("user not found");
    if (args.openCampaigns !== null && args.openCampaigns === true) {
        user.campaigns = user.campaigns.filter((p) => p.campaign.isOpen());
    } else if (args.openCampaigns !== null && args.openCampaigns === false) {
        user.campaigns = user.campaigns.filter((p) => !p.campaign.isOpen());
    }
    return user.asV1();
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
    if (!user) throw new Error("User not found");
    user.profile.deviceToken = deviceToken;
    await user.profile.save();
    return true;
};

export const updateUsername = async (parent: any, args: { username: string }, context: { user: any }) => {
    const user = await User.findUserByContext(context.user);
    if (!user) throw new Error("User not found");
    if (await Profile.findOne({ where: { username: args.username } }))
        throw new Error("username is already registered");
    user.profile.username = args.username;
    await user.profile.save();
    return user.asV1();
};

export const setRecoveryCode = async (parent: any, args: { code: number }, context: { user: any }) => {
    const user = await User.findUserByContext(context.user, ["profile"]);
    if (!user) throw new Error("user not found");
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
    if (!user) throw new Error("user not found");
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
    if (!user) throw new Error("user not found");
    const profile = await Profile.findOne({ where: { user } });
    if (!profile) throw new Error("profile not found");
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
    if (!user) throw new Error("user not found");
    return (await DailyParticipantMetric.getSortedByUser(user, today)).map((metric) => metric.asV1());
};

export const getUserParticipationKeywords = async (parent: any, args: { id: string }, context: { user: any }) => {
    const user = await User.findUserByContext(context.user);
    if (!user) throw new Error("user not found");
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
    if (!user) throw new Error("user not found");
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
    if (!user) throw new Error("user not found");
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
    checkPermissions({ hasRole: ["admin"], restrictCompany: "raiinmaker" }, context);
    const { usernames, title, message } = args;
    if (usernames.length === 0) return false;
    const tokens = (await Profile.find({ where: { username: In(usernames) } })).reduce(
        (accum: string[], curr: Profile) => {
            if (curr.deviceToken) accum.push(curr.deviceToken);
            return accum;
        },
        []
    );
    await Firebase.sendGenericNotification(tokens, title, message);
    return true;
};

export const uploadProfilePicture = async (parent: any, args: { image: string }, context: { user: any }) => {
    const { image } = args;
    const user = await await User.findUserByContext(context.user);
    if (!user) throw new Error("user not found");
    const filename = await S3Client.uploadProfilePicture("profilePicture", user.id, image);
    user.profile.profilePicture = filename;
    user.profile.save();
    return true;
};

export const getWalletBalances = async (parent: any, args: any, context: { user: any }) => {
    const user = await User.findUserByContext(context.user, ["wallet"]);
    if (!user) throw new Error("user not found");
    const coiinCurrency = await WalletCurrency.findOne({
        where: { wallet: await Wallet.findOne({ where: { user: user } }), type: "coiin" },
    });
    const currencies = await Currency.find({ where: { wallet: user.wallet } });
    const balances = await TatumClient.getBalanceForAccountList(currencies);
    let allCurrencies = currencies.map(async (currencyItem) => {
        const balance = balances.find((balanceItem) => currencyItem.tatumId === balanceItem.tatumId);
        const minWithdrawAmount = await getMinWithdrawableAmount(currencyItem.symbol);
        return {
            balance: formatFloat(balance.availableBalance),
            symbol: currencyItem.symbol,
            minWithdrawAmount,
            usdBalance: getUSDValueForCurrency(currencyItem.symbol.toLowerCase(), balance.availableBalance),
            imageUrl: getCryptoAssestImageUrl(currencyItem.symbol),
        };
    });
    if (coiinCurrency) {
        allCurrencies.unshift(
            Promise.resolve({
                symbol: coiinCurrency.type.toUpperCase() || "",
                balance: formatFloat(coiinCurrency.balance.toNumber()),
                minWithdrawAmount: coiinCurrency.balance.toNumber(),
                usdBalance: getUSDValueForCurrency(coiinCurrency.type.toLowerCase(), coiinCurrency.balance.toNumber()),
                imageUrl: getCryptoAssestImageUrl(coiinCurrency.type.toUpperCase()),
            })
        );
    }
    return allCurrencies;
};

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
        if (!user) throw new Error("user not found");
        if (!email) throw new Error("email not provided");
        if (user.profile.email === email) throw new Error("email already exists");
        let verificationData = await Verification.findOne({ where: { email: email, verified: false } });
        if (!verificationData) {
            verificationData = await Verification.createVerification(email);
        }
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
        if (!user) throw new Error("user not found");
        if (!email || !token) throw new Error("email or token missing");
        if (user.profile.email === email) throw new Error("email already exists");
        const verificationData = await Verification.findOne({ where: { email, verified: false } });
        if (!verificationData || decrypt(verificationData.code) !== token)
            throw new Error("invalid token or verfication not initialized");
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
        if (!user) throw new Error("user not found");
        const loginReward = await Transfer.getRewardForThisWeek(user.wallet, "LOGIN_REWARD");
        const participationReward = await Transfer.getRewardForThisWeek(user.wallet, "PARTICIPATION_REWARD");
        const nextReward = startOfDay(addDays(endOfISOWeek(user.lastLogin), 1));
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
        };
    } catch (e) {
        console.log(e);
        return null;
    }
};
