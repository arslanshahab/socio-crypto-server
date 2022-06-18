import { Enum, Get, Put, Property, Required, Returns, Post, Delete } from "@tsed/schema";
import { Controller, Inject } from "@tsed/di";
import { BodyParams, Context, PathParams, QueryParams } from "@tsed/common";
import { BadRequest, NotFound } from "@tsed/exceptions";
import { UserService } from "../../services/UserService";
import {
    PaginatedVariablesModel,
    PaginatedVariablesFilteredModel,
    Pagination,
    SuccessArrayResult,
    SuccessResult,
} from "../../util/entities";
import {
    ALREADY_PARTICIPATING,
    CAMPAIGN_CLOSED,
    CAMPAIGN_NOT_FOUND,
    CURRENCY_NOT_FOUND,
    GLOBAL_CAMPAIGN_NOT_FOUND,
    MISSING_PARAMS,
    NOTIFICATION_SETTING_NOT_FOUND,
    PARTICIPANT_NOT_FOUND,
    TOKEN_NOT_FOUND,
    USER_NOT_FOUND,
    WALLET_NOT_FOUND,
} from "../../util/errors";
import {
    BooleanResultModel,
    CampaignIdModel,
    DashboardStatsResultModel,
    ParticipantMetricsResultModel,
    ProfileResultModel,
    RemoveInterestsParams,
    SingleUserResultModel,
    UpdateProfileInterestsParams,
    UserDailyParticipantMetricResultModel,
    UserParticipateParams,
    UserTransactionResultModel,
    WeeklyRewardsResultModel,
} from "../../models/RestModels";
import { DailyParticipantMetricService } from "../../services/DailyParticipantMetricService";
import {
    BalanceResultModel,
    NotificationSettingsResultModel,
    UserResultModel,
    UserRecordResultModel,
    UserWalletResultModel,
    TransferResultModel,
    UpdatedResultModel,
} from "../../models/RestModels";
import { NotificationService } from "../../services/NotificationService";
import { TransferService } from "../../services/TransferService";
import { BSC, COIIN, CoiinTransferAction, SHARING_REWARD_AMOUNT, TransferAction } from "../../util/constants";
import { SocialService } from "../../services/SocialService";
import { CampaignService } from "../../services/CampaignService";
import { ParticipantService } from "../../services/ParticipantService";
import { TatumClientService } from "../../services/TatumClientService";
import { HourlyCampaignMetricsService } from "../../services/HourlyCampaignMetricsService";
import { SesClient } from "../../clients/ses";
import { CurrencyService } from "../../services/CurrencyService";
import { WalletService } from "../../services/WalletService";
import { TokenService } from "../../services/TokenService";
import { addDays, endOfISOWeek, startOfDay } from "date-fns";
import { ProfileService } from "../../services/ProfileService";

const userResultRelations = {
    profile: true,
    social_link: true,
    participant: { include: { campaign: true } },
    wallet: true,
};

class AddressResultModel {
    @Property() public readonly symbol: string;
    @Property() public readonly network: string;
    @Property() public readonly address: string;
}

class TransferHistoryVariablesModel extends PaginatedVariablesModel {
    @Property() public readonly symbol?: string;
    @Required() @Enum(TransferAction, "ALL") public readonly type: TransferAction & "ALL";
}
class UserQueryVariables {
    @Property() public readonly today: boolean;
}

class TransferUserCoiinParams {
    @Property() public readonly coiin: string;
    @Property() public readonly userId: string;
    @Property() public readonly action: string;
}

class RewardUserForSharingParams {
    @Required() public readonly participantId: string;
    @Required() public readonly isGlobal: boolean;
}
@Controller("/user")
export class UserController {
    @Inject()
    private userService: UserService;
    @Inject()
    private dailyParticipantMetricService: DailyParticipantMetricService;
    @Inject()
    private notificationService: NotificationService;
    @Inject()
    private transferService: TransferService;
    @Inject()
    private socialService: SocialService;
    @Inject()
    private campaignService: CampaignService;
    @Inject()
    private participantService: ParticipantService;
    @Inject()
    private tatumClientService: TatumClientService;
    @Inject()
    private hourlyCampaignMetricsService: HourlyCampaignMetricsService;
    @Inject()
    private currencyService: CurrencyService;
    @Inject()
    private walletService: WalletService;
    @Inject()
    private tokenService: TokenService;
    @Inject()
    private profileService: ProfileService;

    @Get("/")
    @(Returns(200, SuccessResult).Of(Pagination).Nested(UserResultModel))
    public async list(@QueryParams() query: PaginatedVariablesModel, @Context() context: Context) {
        this.userService.checkPermissions({ hasRole: ["admin"] }, context.get("user"));
        const { skip = 0, take = 10 } = query;
        const [results, total] = await this.userService.findUsers({ skip, take }, userResultRelations);

        return new SuccessResult(
            new Pagination(
                results.map((r) => UserResultModel.build(r)),
                total,
                UserResultModel
            ),
            Pagination
        );
    }

    @Get("/me")
    @(Returns(200, SuccessResult).Of(UserResultModel))
    public async me(@Context() context: Context) {
        const user = await this.userService.findUserByContext(context.get("user"), userResultRelations);
        if (!user) throw new BadRequest(USER_NOT_FOUND);

        return new SuccessResult(UserResultModel.build(user), UserResultModel);
    }

    @Get("/me/participation-keywords")
    @(Returns(200, SuccessArrayResult).Of(String))
    public async getParticipationKeywords(@Context() context: Context) {
        const user = await this.userService.findUserByContext(context.get("user"), {
            participant: {
                include: {
                    campaign: true,
                },
            },
        });
        if (!user) throw new BadRequest(USER_NOT_FOUND);
        console.log(user.participant);
        const keywords = new Set<string>();
        try {
            user.participant.forEach((p) =>
                (JSON.parse(p.campaign.keywords) as string[]).forEach((k) => keywords.add(k))
            );
        } catch (e) {
            context.logger.error(e);
        }
        return new SuccessResult([...keywords], Array);
    }

    @Get("/me/balances")
    @(Returns(200, SuccessArrayResult).Of(BalanceResultModel))
    public async getBalances(@Context() context: Context) {
        const user = await this.userService.findUserByContext(context.get("user"), {
            wallet: { include: { currency: { include: { token: true } } } },
        });
        if (!user) throw new NotFound(USER_NOT_FOUND);
        if (!user.wallet) throw new NotFound(WALLET_NOT_FOUND);
        const balances = await this.userService.getUserWalletBalances(user.wallet);
        return new SuccessArrayResult(
            balances.filter(<T>(r: T | null): r is T => !!r),
            BalanceResultModel
        );
    }

    @Get("/me/notification-settings")
    @(Returns(200, SuccessResult).Of(NotificationSettingsResultModel))
    public async getNotificationSettings(@Context() context: Context) {
        const user = await this.userService.findUserByContext(context.get("user"));
        if (!user) throw new BadRequest(USER_NOT_FOUND);
        const settings = await this.notificationService.findNotificationSettingByUserId(user.id);
        if (!settings) throw new NotFound(NOTIFICATION_SETTING_NOT_FOUND);
        return new SuccessResult(settings, NotificationSettingsResultModel);
    }
    @Get("/user-metrics")
    @(Returns(200, SuccessResult).Of(UserDailyParticipantMetricResultModel))
    public async getUserMetrics(@QueryParams() query: UserQueryVariables, @Context() context: Context) {
        const { today } = query;
        const user = await this.userService.findUserByContext(context.get("user"));
        if (!user) throw new BadRequest(USER_NOT_FOUND);
        const result = await this.dailyParticipantMetricService.getSortedByUserId(user.id, today);
        return new SuccessResult(
            new Pagination(result, result.length, UserDailyParticipantMetricResultModel),
            Pagination
        );
    }
    @Get("/me/coiin-address")
    @(Returns(200, SuccessResult).Of(AddressResultModel))
    public async getCoiinAddress(@Context() context: Context) {
        const user = await this.userService.findUserByContext(context.get("user"));
        if (!user) throw new BadRequest(USER_NOT_FOUND);
        const wallet = await this.walletService.findWalletByUserId(user.id);
        if (!wallet) throw new BadRequest(WALLET_NOT_FOUND);
        return new SuccessResult(await this.userService.getCoiinAddress({ ...user, wallet }), AddressResultModel);
    }

    @Get("/me/transfer-history")
    @(Returns(200, SuccessResult).Of(Pagination).Nested(TransferResultModel))
    public async getTransferHistory(@QueryParams() query: TransferHistoryVariablesModel, @Context() context: Context) {
        const user = await this.userService.findUserByContext(context.get("user"));
        if (!user) throw new BadRequest(USER_NOT_FOUND);
        const wallet = await this.walletService.findWalletByUserId(user.id);
        if (!wallet) throw new BadRequest(WALLET_NOT_FOUND);
        const [data, count] = await this.transferService.findByWallet({
            ...query,
            walletId: wallet.id,
        });
        const results = data.map((item) => TransferResultModel.build(item));

        return new SuccessResult(new Pagination(results, count, TransferResultModel), Pagination);
    }

    @Get("/me/follower-count")
    @(Returns(200, SuccessResult).Of(Object))
    public async getFollowerCount(@Context() context: Context) {
        const user = await this.userService.findUserByContext(context.get("user"), {
            social_link: true,
        });
        if (!user) throw new BadRequest(USER_NOT_FOUND);

        return new SuccessResult(await this.socialService.getLatestFollowersForLinks(user.social_link), Object);
    }

    @Get("/users-record")
    @(Returns(200, SuccessResult).Of(Pagination).Nested(UserRecordResultModel))
    public async getUsersRecord(@QueryParams() query: PaginatedVariablesFilteredModel, @Context() context: Context) {
        const { skip = 0, take = 10, filter } = query;
        const [users, count] = await this.userService.findUsersRecord(skip, take, filter);
        return new SuccessResult(new Pagination(users, count, UserRecordResultModel), Pagination);
    }

    @Get("/user-balances/:userId")
    @(Returns(200, SuccessResult).Of(UserWalletResultModel))
    public async getUserBalances(@PathParams() query: { userId: string }, @Context() context: Context) {
        const user = await this.userService.findUserById(query.userId, {
            wallet: {
                include: {
                    currency: {
                        include: {
                            token: true,
                        },
                    },
                },
            },
        });
        if (!user) throw new NotFound(USER_NOT_FOUND);
        if (!user.wallet) throw new NotFound(WALLET_NOT_FOUND);
        const currencies = await this.userService.getUserWalletBalances(user.wallet);
        return new SuccessArrayResult(
            currencies.filter(<T>(r: T | null): r is T => !!r),
            BalanceResultModel
        );
    }

    @Put("/update-user-status")
    @(Returns(200, SuccessResult).Of(UpdatedResultModel))
    public async updateUserStatus(
        @BodyParams() body: { id: string; activeStatus: boolean },
        @Context() context: Context
    ) {
        const { id, activeStatus } = body;
        await this.userService.updateUserStatus(id, activeStatus);
        const result = { message: "User status updated successfully" };
        return new SuccessResult(result, UpdatedResultModel);
    }

    @Post("/participate")
    @(Returns(200, SuccessResult).Of(ParticipantMetricsResultModel))
    public async participate(@QueryParams() query: UserParticipateParams, @Context() context: Context) {
        const user = await this.userService.findUserByContext(context.get("user"), ["wallet"]);
        if (!user) throw new NotFound(USER_NOT_FOUND);
        const { campaignId, email } = query;
        const campaign = await this.campaignService.findCampaignById(campaignId, {
            org: true,
            currency: { include: { token: true } },
        });
        if (!campaign) throw new NotFound(CAMPAIGN_NOT_FOUND);
        if (campaign.type === "raffle" && email) throw new BadRequest(MISSING_PARAMS);

        if (await !this.campaignService.isCampaignOpen(campaign.id)) throw new BadRequest(CAMPAIGN_CLOSED);
        if (await this.participantService.findParticipantByUserAndCampaignIds(user.id, campaign.id))
            throw new BadRequest(ALREADY_PARTICIPATING);
        await this.tatumClientService.findOrCreateCurrency({ ...campaign?.currency?.token!, wallet: user.wallet! });
        const participant = await this.participantService.createNewParticipant(user.id, campaign, email);
        if (!campaign.isGlobal)
            await this.userService.transferCoiinReward({ user, type: "PARTICIPATION_REWARD", campaign });
        return new SuccessResult(participant, ParticipantMetricsResultModel);
    }

    @Post("/remove-participation")
    @(Returns(200, SuccessResult).Of(BooleanResultModel))
    public async removeParticipation(@QueryParams() query: CampaignIdModel, @Context() context: Context) {
        const user = await this.userService.findUserByContext(context.get("user"));
        if (!user) throw new NotFound(USER_NOT_FOUND);
        const { campaignId } = query;
        const campaign = await this.campaignService.findCampaignById(campaignId, { org: true });
        if (!campaign) throw new NotFound(CAMPAIGN_NOT_FOUND);
        const participant = await this.participantService.findParticipantByUserAndCampaignIds(user.id, campaign.id);
        if (!participant) throw new NotFound(PARTICIPANT_NOT_FOUND);
        await this.hourlyCampaignMetricsService.upsertMetrics(campaign.id, campaign.org?.id, "removeParticipant");
        await this.participantService.removeParticipant(participant);
        return new SuccessResult({ success: true }, BooleanResultModel);
    }

    @Get("/user-transactions-history/:userId")
    @(Returns(200, SuccessResult).Of(Pagination).Nested(UserTransactionResultModel))
    public async getUserTransactionHistory(@PathParams() query: { userId: string }, @Context() context: Context) {
        this.userService.checkPermissions({ hasRole: ["admin"] }, context.get("user"));
        const { userId } = query;
        const transaction = await this.transferService.findUserTransactions(userId);
        return new SuccessResult(
            new Pagination(transaction, transaction.length, UserTransactionResultModel),
            Pagination
        );
    }

    @Get("/user-stats")
    @(Returns(200, SuccessResult).Of(DashboardStatsResultModel))
    public async getDashboardStats(@Context() context: Context) {
        this.userService.checkPermissions({ hasRole: ["admin"] }, context.get("user"));
        const [totalUsers, lastWeekUsers, bannedUsers] = await this.userService.getUserCount();
        const [redeemTransactions, distributedTransactions] = await this.transferService.getCoiinRecord();
        let redeemedTotalAmount = redeemTransactions.reduce((acc, cur) => acc + parseFloat(cur.amount), 0);
        let distributedTotalAmount = distributedTransactions.reduce((acc, cur) => acc + parseFloat(cur.amount), 0);
        redeemedTotalAmount = parseFloat(redeemedTotalAmount.toFixed(2));
        distributedTotalAmount = parseFloat(distributedTotalAmount.toFixed(2));
        const result = { totalUsers, lastWeekUsers, bannedUsers, distributedTotalAmount, redeemedTotalAmount };
        return new SuccessResult(result, DashboardStatsResultModel);
    }

    @Delete()
    @(Returns(200, SuccessResult).Of(BooleanResultModel))
    public async deleteUser(@Context() context: Context) {
        const user = await this.userService.findUserByContext(context.get("user"));
        if (!user) throw new NotFound(USER_NOT_FOUND);
        await this.userService.deleteUser(user.id);
        const result = { message: "User account deleted." };
        return new SuccessResult(result, UpdatedResultModel);
    }

    @Post("/delete-user-by-id/:userId")
    @(Returns(200, SuccessResult).Of(BooleanResultModel))
    public async deleteUserById(@PathParams() query: { userId: string }, @Context() context: Context) {
        const { userId } = query;
        const user = await this.userService.findUserById(userId);
        if (!user) throw new NotFound(USER_NOT_FOUND);
        await this.userService.deleteUser(user.id);
        const result = { message: "User account deleted." };
        return new SuccessResult(result, UpdatedResultModel);
    }

    @Put("/reset-user-password/:userId")
    @(Returns(200, SuccessResult).Of(BooleanResultModel))
    public async resetUserPassword(@PathParams() query: { userId: string }, @Context() context: Context) {
        this.userService.checkPermissions({ hasRole: ["admin"] }, context.get("user"));
        const { userId } = query;
        const user = await this.userService.findUserById(userId);
        if (!user) throw new NotFound(USER_NOT_FOUND);
        const chars = process.env.PASSWORD_CHARSET || "789abcdxyz!@#$%^&*";
        const passwordLength = 8;
        let password = "";
        for (var i = 0; i <= passwordLength; i++) {
            var randomNumber = Math.floor(Math.random() * chars.length);
            password += chars.substring(randomNumber, randomNumber + 1);
        }
        await this.userService.resetUserPassword(user.id, user.email, password);
        await SesClient.restUserPasswordEmail(user.email, password);
        const result = { message: "User password reset successfully" };
        return new SuccessResult(result, UpdatedResultModel);
    }

    @Get("/single-user/:userId")
    @(Returns(200, SuccessResult).Of(SingleUserResultModel))
    public async getUserById(@PathParams() query: { userId: string }, @Context() context: Context) {
        this.userService.checkPermissions({ hasRole: ["admin", "manager"] }, context.get("user"));
        const user = await this.userService.findUserById(query.userId, ["profile", "social_post"]);
        if (!user) throw new NotFound(USER_NOT_FOUND);
        return new SuccessResult(user, SingleUserResultModel);
    }

    @Post("/transfer-user-coiin")
    @(Returns(200, SuccessResult).Of(UpdatedResultModel))
    public async transferUserCoiin(@BodyParams() body: TransferUserCoiinParams, @Context() context: Context) {
        this.userService.checkPermissions({ hasRole: ["admin"] }, context.get("user"));
        const admin = await this.userService.findUserByFirebaseId(context.get("user").firebaseId);
        const { coiin, userId, action } = body;
        const { ADD } = CoiinTransferAction;
        const token = await this.tokenService.findTokenBySymbol({ symbol: COIIN, network: BSC });
        if (!token) throw new NotFound(TOKEN_NOT_FOUND);
        const userWallet = await this.walletService.findWalletByUserId(userId);
        if (!userWallet) throw new NotFound(WALLET_NOT_FOUND + "for userId");
        const orgWallet = await this.walletService.findWalletByOrgId(admin?.orgId!);
        if (!orgWallet) throw new NotFound(WALLET_NOT_FOUND + "for orgId");
        const userCurrency = await this.currencyService.findCurrencyByTokenId(token.id, userWallet.id);
        if (!userCurrency) throw new NotFound(CURRENCY_NOT_FOUND + " for user");
        const orgCurrency = await this.currencyService.findCurrencyByTokenId(token.id, orgWallet?.id!);
        if (!orgCurrency) throw new NotFound(CURRENCY_NOT_FOUND + " for org");
        try {
            await this.tatumClientService.transferFunds({
                senderAccountId: action === ADD ? orgCurrency?.tatumId : userCurrency?.tatumId,
                recipientAccountId: action === ADD ? userCurrency?.tatumId : orgCurrency?.tatumId,
                amount: coiin,
                recipientNote: "Transfer Coiin",
            });
        } catch (error) {
            throw new Error(error.message);
        }
        return new SuccessResult({ message: "Transfer funds successfully" }, UpdatedResultModel);
    }

    @Get("/weekly-rewards")
    @(Returns(200, SuccessResult).Of(WeeklyRewardsResultModel))
    public async getWeeklyRewards(@Context() context: Context) {
        const user = await this.userService.findUserByContext(context.get("user"));
        if (!user) throw new NotFound(USER_NOT_FOUND);
        const wallet = await this.walletService.findWalletByUserId(user.id);
        if (!wallet) throw new NotFound(WALLET_NOT_FOUND);
        const loginReward = await this.transferService.getRewardForThisWeek(wallet.id, "LOGIN_REWARD");
        const participationReward = await this.transferService.getRewardForThisWeek(wallet.id, "PARTICIPATION_REWARD");
        const nextReward = startOfDay(addDays(endOfISOWeek(user.lastLogin!), 1));
        const coiinEarnedToday = await this.transferService.getCoinnEarnedToday(wallet.id);
        const result = {
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
        };
        return new SuccessResult(result, WeeklyRewardsResultModel);
    }

    @Post("/update-profile-interests")
    @(Returns(200, SuccessResult).Of(ProfileResultModel))
    public async updateProfileInterests(@BodyParams() body: UpdateProfileInterestsParams, @Context() context: Context) {
        const user = await this.userService.findUserByContext(context.get("user"));
        if (!user) throw new NotFound(USER_NOT_FOUND);
        const profile = await this.profileService.updateProfile(user.id, body);
        return new SuccessResult(await ProfileResultModel.build(profile), ProfileResultModel);
    }

    @Post("/remove-profile-interests")
    @(Returns(200, SuccessResult).Of(ProfileResultModel))
    public async removeProfileInterests(@BodyParams() body: RemoveInterestsParams, @Context() context: Context) {
        const user = await this.userService.findUserByContext(context.get("user"));
        if (!user) throw new NotFound(USER_NOT_FOUND);
        const profile = await this.profileService.removeProfileInterests(user.id, body);
        return new SuccessResult(ProfileResultModel.build(profile), ProfileResultModel);
    }

    @Post("/reward-user-for-sharing")
    @(Returns(200, SuccessResult).Of(UpdatedResultModel))
    public async rewardUserForSharing(@BodyParams() body: RewardUserForSharingParams, @Context() context: Context) {
        const user = await this.userService.findUserByContext(context.get("user"));
        if (!user) throw new NotFound(USER_NOT_FOUND);
        const { participantId, isGlobal } = body;
        const wallet = await this.walletService.findWalletByUserId(user.id);
        if (!wallet) throw new NotFound(WALLET_NOT_FOUND);
        let participant;
        let campaign;
        if (isGlobal) {
            const globalCampaign = await this.campaignService.findGlobalCampaign(isGlobal, COIIN);
            if (!globalCampaign) throw new NotFound(GLOBAL_CAMPAIGN_NOT_FOUND);
            campaign = globalCampaign;
            participant = await this.participantService.findParticipantByUserAndCampaignId(user.id, campaign.id);
            if (!participant) {
                await this.tatumClientService.findOrCreateCurrency({ symbol: COIIN, network: BSC, wallet: wallet });
                participant = await this.participantService.createNewParticipant(user.id, globalCampaign, user.email);
            }
        } else {
            participant = await this.participantService.findParticipantById(participantId, user);
            if (!participant) throw new NotFound(PARTICIPANT_NOT_FOUND);
            campaign = participant.campaign;
        }
        if (!participant) throw new NotFound(PARTICIPANT_NOT_FOUND);
        await this.userService.transferCoiinReward({
            user: user,
            type: "SHARING_REWARD",
            campaign: campaign,
        });
        return new SuccessResult({ success: true }, BooleanResultModel);
    }
}
