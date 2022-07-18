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
    ADMIN_NOT_FOUND,
    ALREADY_PARTICIPATING,
    CAMPAIGN_CLOSED,
    CAMPAIGN_NOT_FOUND,
    CURRENCY_NOT_FOUND,
    EMAIL_EXISTS,
    GLOBAL_CAMPAIGN_NOT_FOUND,
    INCORRECT_PASSWORD,
    INVALID_TOKEN,
    MISSING_PARAMS,
    NOTIFICATION_SETTING_NOT_FOUND,
    ORG_NOT_FOUND,
    PARTICIPANT_NOT_FOUND,
    PROFILE_NOT_FOUND,
    SAME_OLD_AND_NEW_PASSWORD,
    TOKEN_NOT_FOUND,
    USERNAME_EXISTS,
    USER_NOT_FOUND,
    WALLET_NOT_FOUND,
} from "../../util/errors";
import {
    BooleanResultModel,
    CampaignIdModel,
    DashboardStatsResultModel,
    ProfileResultModel,
    RemoveInterestsParams,
    ReturnSuccessResultModel,
    SingleUserResultModel,
    UpdateNotificationSettingsParams,
    UpdateNotificationSettingsResultModel,
    UpdateProfileInterestsParams,
    UserDailyParticipantMetricResultModel,
    UserParticipateParams,
    UserTransactionResultModel,
    WeeklyRewardsResultModel,
    ParticipateToCampaignModel,
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
import {
    BSC,
    COIIN,
    CoiinTransferAction,
    SharingRewardType,
    SHARING_REWARD_AMOUNT,
    SocialClientType,
    TransferAction,
    UserRewardType,
} from "../../util/constants";
import { SocialService } from "../../services/SocialService";
import { CampaignService } from "../../services/CampaignService";
import { ParticipantService } from "../../services/ParticipantService";
import { TatumService } from "../../services/TatumService";
import { HourlyCampaignMetricsService } from "../../services/HourlyCampaignMetricsService";
import { SesClient } from "../../clients/ses";
import { CurrencyService } from "../../services/CurrencyService";
import { WalletService } from "../../services/WalletService";
import { TokenService } from "../../services/TokenService";
import { addDays, endOfISOWeek, startOfDay } from "date-fns";
import { ProfileService } from "../../services/ProfileService";
import { createPasswordHash } from "../../util";
import { AdminService } from "../../services/AdminService";
import { Firebase } from "../../clients/firebase";
import { VerificationService } from "../../services/VerificationService";
import { decrypt } from "../../util/crypto";
import { S3Client } from "../../clients/s3";
import { VerificationApplicationService } from "../../services/VerificationApplicationService";
import { Parser } from "json2csv";
import { DragonchainService } from "../../services/DragonchainService";

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
    @Property() public readonly participantId: string;
    @Required() public readonly isGlobal: boolean;
    @Property() public readonly socialType: SocialClientType;
}

class UpdateUserPasswordParams {
    @Required() public readonly oldPassword: string;
    @Required() public readonly newPassword: string;
}

class UpdateUserNameParams {
    @Required() public readonly username: string;
}

class PromotePermissionsParams {
    @Required() public readonly firebaseId: string;
    @Property() public readonly company: string;
    @Property() public readonly role: "admin" | "manager";
}

class SetRecoveryCodeParams {
    @Required() public readonly code: number;
}

class SetDeviceParams {
    @Required() public readonly deviceToken: string;
}

class StartEmailVerificationParams {
    @Required() public readonly email: string;
}

class CompleteEmailVerificationParams {
    @Required() public readonly email: string;
    @Required() public readonly token: string;
}

class UploadProfilePictureParams {
    @Required() public readonly image: string;
}

class UserIdParam {
    @Property() public readonly userId: string;
}

class UserStatusParams {
    @Required() public readonly id: string;
    @Required() public readonly activeStatus: boolean;
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
    private tatumService: TatumService;
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
    @Inject()
    private adminService: AdminService;
    @Inject()
    private verificationService: VerificationService;
    @Inject()
    private verificationApplicationService: VerificationApplicationService;
    @Inject()
    private dragonchainService: DragonchainService;

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
        const kyc = await this.verificationApplicationService.getKycData(user.id);
        return new SuccessResult(UserResultModel.build(user, kyc), UserResultModel);
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
        if (COIIN)
            throw new Error("This feature is currently disabled. Please contact our support for further assistance.");
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
    public async getUserBalances(@PathParams() path: UserIdParam, @Context() context: Context) {
        const user = await this.userService.findUserById(path.userId, {
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
    public async updateUserStatus(@BodyParams() body: UserStatusParams, @Context() context: Context) {
        const { id, activeStatus } = body;
        await this.userService.updateUserStatus(id, activeStatus);
        const result = { message: "User status updated successfully" };
        return new SuccessResult(result, UpdatedResultModel);
    }

    @Post("/participate")
    @(Returns(200, SuccessResult).Of(ParticipateToCampaignModel))
    public async participate(@QueryParams() query: UserParticipateParams, @Context() context: Context) {
        const user = await this.userService.findUserByContext(context.get("user"), ["wallet", "profile"]);
        if (!user) throw new NotFound(USER_NOT_FOUND);
        const { campaignId, email } = query;
        const campaign = await this.campaignService.findCampaignById(campaignId, {
            org: true,
            currency: { include: { token: true } },
        });
        if (!campaign) throw new NotFound(CAMPAIGN_NOT_FOUND);
        if (campaign.type === "raffle" && !email) throw new BadRequest(MISSING_PARAMS);

        if (await !this.campaignService.isCampaignOpen(campaign.id)) throw new BadRequest(CAMPAIGN_CLOSED);
        if (await this.participantService.findParticipantByCampaignId(campaign.id, user.id))
            throw new BadRequest(ALREADY_PARTICIPATING);
        await this.tatumService.findOrCreateCurrency({ ...campaign?.currency?.token!, wallet: user.wallet! });
        const participant = await this.participantService.createNewParticipant(user.id, campaign, email);
        if (!campaign.isGlobal)
            await this.userService.transferCoiinReward({ user, type: UserRewardType.PARTICIPATION_REWARD, campaign });
        return new SuccessResult(
            ParticipateToCampaignModel.build({
                ...participant,
                campaign: campaign,
                user: user,
            }),
            ParticipateToCampaignModel
        );
    }

    @Delete("/remove-participation/:campaignId")
    @(Returns(200, SuccessResult).Of(BooleanResultModel))
    public async removeParticipation(@PathParams() path: CampaignIdModel, @Context() context: Context) {
        const user = await this.userService.findUserByContext(context.get("user"));
        if (!user) throw new NotFound(USER_NOT_FOUND);
        const { campaignId } = path;
        const campaign = await this.campaignService.findCampaignById(campaignId, { org: true });
        if (!campaign) throw new NotFound(CAMPAIGN_NOT_FOUND);
        if (!campaign.org) throw new NotFound(ORG_NOT_FOUND);
        const participant = await this.participantService.findParticipantByCampaignId(campaign.id, user.id);
        if (!participant) throw new NotFound(PARTICIPANT_NOT_FOUND);
        await this.hourlyCampaignMetricsService.upsertMetrics(campaign.id, campaign.org.id, "removeParticipant");
        await this.participantService.removeParticipant(participant);
        return new SuccessResult({ success: true }, BooleanResultModel);
    }

    @Get("/user-transactions-history/:userId")
    @(Returns(200, SuccessResult).Of(Pagination).Nested(UserTransactionResultModel))
    public async getUserTransactionHistory(@PathParams() path: UserIdParam, @Context() context: Context) {
        this.userService.checkPermissions({ hasRole: ["admin"] }, context.get("user"));
        const { userId } = path;
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
    public async deleteUserById(@PathParams() path: UserIdParam, @Context() context: Context) {
        const { userId } = path;
        const user = await this.userService.findUserById(userId);
        if (!user) throw new NotFound(USER_NOT_FOUND);
        await this.userService.deleteUser(user.id);
        const result = { message: "User account deleted." };
        return new SuccessResult(result, UpdatedResultModel);
    }

    @Put("/reset-user-password/:userId")
    @(Returns(200, SuccessResult).Of(BooleanResultModel))
    public async resetUserPassword(@PathParams() path: UserIdParam, @Context() context: Context) {
        this.userService.checkPermissions({ hasRole: ["admin"] }, context.get("user"));
        const { userId } = path;
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
        return new SuccessResult({ message: "User password reset successfully" }, UpdatedResultModel);
    }

    @Get("/single-user/:userId")
    @(Returns(200, SuccessResult).Of(SingleUserResultModel))
    public async getUserById(@PathParams() path: UserIdParam, @Context() context: Context) {
        this.userService.checkPermissions({ hasRole: ["admin", "manager"] }, context.get("user"));
        const user = await this.userService.findUserById(path.userId, ["profile", "social_post"]);
        if (!user) throw new NotFound(USER_NOT_FOUND);
        return new SuccessResult({ ...user, profile: ProfileResultModel.build(user?.profile!) }, SingleUserResultModel);
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
        if (!userWallet) throw new NotFound(WALLET_NOT_FOUND + " for userId");
        const orgWallet = await this.walletService.findWalletByOrgId(admin?.orgId!);
        if (!orgWallet) throw new NotFound(WALLET_NOT_FOUND + " for orgId");
        const userCurrency = await this.currencyService.findCurrencyByTokenAndWallet({
            tokenId: token.id,
            walletId: userWallet.id,
        });
        if (!userCurrency) throw new NotFound(CURRENCY_NOT_FOUND + " for user");
        const orgCurrency = await this.currencyService.findCurrencyByTokenAndWallet({
            tokenId: token.id,
            walletId: orgWallet?.id!,
        });
        if (!orgCurrency) throw new NotFound(CURRENCY_NOT_FOUND + " for org");
        try {
            await this.tatumService.transferFunds({
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
            sharingRewardType: SharingRewardType.COIIN,
        };
        return new SuccessResult(result, WeeklyRewardsResultModel);
    }

    @Post("/update-profile-interests")
    @(Returns(200, SuccessResult).Of(UserResultModel))
    public async updateProfileInterests(@BodyParams() body: UpdateProfileInterestsParams, @Context() context: Context) {
        const user = await this.userService.findUserByContext(context.get("user"), ["profile"]);
        if (!user) throw new NotFound(USER_NOT_FOUND);
        const profile = await this.profileService.updateProfile(user.id, body);
        user.profile = profile;
        return new SuccessResult(UserResultModel.build(user), UserResultModel);
    }

    @Post("/remove-profile-interests")
    @(Returns(200, SuccessResult).Of(UserResultModel))
    public async removeProfileInterests(@BodyParams() body: RemoveInterestsParams, @Context() context: Context) {
        const user = await this.userService.findUserByContext(context.get("user"), ["profile"]);
        if (!user) throw new NotFound(USER_NOT_FOUND);
        const profile = await this.profileService.removeProfileInterests(user.id, body);
        user.profile = profile;
        return new SuccessResult(UserResultModel.build(user), UserResultModel);
    }

    @Post("/reward-user-for-sharing")
    @(Returns(200, SuccessResult).Of(BooleanResultModel))
    public async rewardUserForSharing(@BodyParams() body: RewardUserForSharingParams, @Context() context: Context) {
        const user = await this.userService.findUserByContext(context.get("user"));
        if (!user) throw new NotFound(USER_NOT_FOUND);
        const { participantId, isGlobal, socialType } = body;
        const wallet = await this.walletService.findWalletByUserId(user.id);
        if (!wallet) throw new NotFound(WALLET_NOT_FOUND);
        let participant;
        let campaign;
        if (isGlobal) {
            const globalCampaign = await this.campaignService.findGlobalCampaign(isGlobal, COIIN);
            if (!globalCampaign) throw new NotFound(GLOBAL_CAMPAIGN_NOT_FOUND);
            campaign = globalCampaign;
            participant = await this.participantService.findParticipantByCampaignId(campaign.id, user.id);
            if (!participant) {
                await this.tatumService.findOrCreateCurrency({ symbol: COIIN, network: BSC, wallet: wallet });
                participant = await this.participantService.createNewParticipant(user.id, globalCampaign, user.email);
            }
        } else {
            participant = await this.participantService.findParticipantById(participantId, { campaign: true });
            if (!participant) throw new NotFound(PARTICIPANT_NOT_FOUND);
            campaign = participant.campaign;
        }
        if (!participant) throw new NotFound(PARTICIPANT_NOT_FOUND);
        await this.userService.transferCoiinReward({
            user: user,
            type: UserRewardType.SHARING_REWARD,
            campaign: campaign,
        });
        await this.dragonchainService.ledgerSocialShare({ socialType, participantId });
        return new SuccessResult({ success: true }, BooleanResultModel);
    }

    @Put("/update-user-password")
    @(Returns(200, SuccessResult).Of(BooleanResultModel))
    public async updateUserPassword(@BodyParams() body: UpdateUserPasswordParams, @Context() context: Context) {
        const user = await this.userService.findUserByContext(context.get("user"));
        if (!user) throw new NotFound(USER_NOT_FOUND);
        const { oldPassword, newPassword } = body;
        if (createPasswordHash({ email: user.email, password: oldPassword }) !== user.password)
            throw new BadRequest(INCORRECT_PASSWORD);
        if (
            createPasswordHash({ email: user.email, password: oldPassword }) ===
            createPasswordHash({ email: user.email, password: newPassword })
        )
            throw new Error(SAME_OLD_AND_NEW_PASSWORD);
        await this.userService.resetUserPassword(user.id, user.email, newPassword);
        return new SuccessResult({ success: true }, BooleanResultModel);
    }

    @Put("/update-user-name/:username")
    @(Returns(200, SuccessResult).Of(UserResultModel))
    public async updateUserName(@PathParams() path: UpdateUserNameParams, @Context() context: Context) {
        const { username } = path;
        if (await this.profileService.ifUsernameExist(username)) throw new BadRequest(USERNAME_EXISTS);
        let user = await this.userService.findUserByContext(context.get("user"), { profile: true });
        if (!user) throw new NotFound(USER_NOT_FOUND);
        user.profile = await this.profileService.updateUsername(user.id, username);
        return new SuccessResult(UserResultModel.build(user), UserResultModel);
    }

    @Put("/promote-permissions")
    @(Returns(200, SuccessResult).Of(UpdatedResultModel))
    public async promotePermissions(@BodyParams() body: PromotePermissionsParams, @Context() context: Context) {
        const { role, company } = this.userService.checkPermissions(
            { hasRole: ["admin", "manager"] },
            context.get("user")
        );
        const { firebaseId } = body;
        if (!firebaseId) throw new BadRequest(MISSING_PARAMS);
        const admin = await this.adminService.findAdminByFirebaseId(firebaseId);
        if (!admin) throw new NotFound(ADMIN_NOT_FOUND);
        try {
            if (role === "manager") {
                await Firebase.adminClient.auth().setCustomUserClaims(admin.firebaseId, { role: "manager", company });
            } else {
                if (!body.role) throw new BadRequest(MISSING_PARAMS);
                await Firebase.adminClient.auth().setCustomUserClaims(admin.firebaseId, {
                    role: body.role,
                    company: body.company || company,
                });
            }
        } catch (error) {
            console.log(error);
        }
        return new SuccessResult({ message: "User record updated successfully" }, UpdatedResultModel);
    }

    @Put("/set-recovery-code")
    @(Returns(200, SuccessResult).Of(UserResultModel))
    public async setRecoveryCode(@BodyParams() body: SetRecoveryCodeParams, @Context() context: Context) {
        let user = await this.userService.findUserByContext(context.get("user"), { profile: true });
        if (!user) throw new NotFound(USER_NOT_FOUND);
        if (!user.profile) throw new NotFound(PROFILE_NOT_FOUND);
        const { code } = body;
        const profile = await this.profileService.setRecoveryCode(user.profile.id, code);
        user.profile = profile;
        return new SuccessResult(UserResultModel.build(user), UserResultModel);
    }

    @Put("/update-notification-settings")
    @(Returns(200, SuccessResult).Of(UpdateNotificationSettingsResultModel))
    public async updateNotificationSettings(
        @BodyParams() body: UpdateNotificationSettingsParams,
        @Context() context: Context
    ) {
        const user = await this.userService.findUserByContext(context.get("user"), { profile: true });
        if (!user) throw new NotFound(USER_NOT_FOUND);
        const notificationSettings = await this.notificationService.updateNotificationSettings(user.id, body);
        return new SuccessResult(
            { user: UserResultModel.build(user), notificationSettings },
            UpdateNotificationSettingsResultModel
        );
    }

    @Put("/set-device")
    @(Returns(200, SuccessResult).Of(BooleanResultModel))
    public async setDevice(@BodyParams() body: SetDeviceParams, @Context() context: Context) {
        const user = await this.userService.findUserByContext(context.get("user"));
        if (!user) throw new NotFound(USER_NOT_FOUND);
        const { deviceToken } = body;
        await this.profileService.updateDeviceToken(user.id, deviceToken);
        return new SuccessResult({ success: true }, BooleanResultModel);
    }

    @Post("/start-email-verification")
    @(Returns(200, SuccessResult).Of(ReturnSuccessResultModel))
    public async startEmailVerification(@BodyParams() body: StartEmailVerificationParams, @Context() context: Context) {
        const { email } = body;
        if ((await this.userService.ifEmailExist(email)) || (await this.profileService.ifEmailExist(email)))
            throw new BadRequest(EMAIL_EXISTS);
        const user = await this.userService.findUserByContext(context.get("user"));
        if (!user) throw new NotFound(USER_NOT_FOUND);
        const profile = await this.profileService.findProfileByUserId(user.id);
        if (!profile) throw new NotFound(PROFILE_NOT_FOUND);
        const verificationData = await this.verificationService.generateVerification({ email, type: "EMAIL" });
        await SesClient.emailAddressVerificationEmail(
            email,
            this.verificationService.getDecryptedCode(verificationData.code)
        );
        return new SuccessResult(
            { success: true, message: "Email sent to provided email address" },
            ReturnSuccessResultModel
        );
    }

    @Post("/complete-email-verification")
    @(Returns(200, SuccessResult).Of(ReturnSuccessResultModel))
    public async completeEmailVerification(
        @BodyParams() body: CompleteEmailVerificationParams,
        @Context() context: Context
    ) {
        const user = await this.userService.findUserByContext(context.get("user"));
        if (!user) throw new NotFound(USER_NOT_FOUND);
        const { email, token } = body;
        if ((await this.userService.findUserByEmail(email)) || (await this.profileService.findProfileByEmail(email)))
            throw new BadRequest(EMAIL_EXISTS);

        const verificationData = await this.verificationService.findVerificationByEmail(email);
        if (!verificationData || decrypt(verificationData.code) !== token) throw new BadRequest(INVALID_TOKEN);
        await this.userService.updateUserEmail(user.id, email);
        await this.verificationService.updateVerificationStatus(true, verificationData.id);
        return new SuccessResult({ success: true, message: "Email address verified" }, ReturnSuccessResultModel);
    }

    @Post("/upload-profile-picture")
    @(Returns(200, SuccessResult).Of(BooleanResultModel))
    public async uploadProfilePicture(@BodyParams() body: UploadProfilePictureParams, @Context() context: Context) {
        const user = await this.userService.findUserByContext(context.get("user"));
        if (!user) throw new NotFound(USER_NOT_FOUND);
        const { image } = body;
        const filename = await S3Client.uploadProfilePicture("profilePicture", user.id, image);
        await this.profileService.updateProfilePicture(user.id, filename);
        return new SuccessResult({ success: true }, BooleanResultModel);
    }

    @Get("/record")
    @Returns(200, SuccessResult)
    public async downloadUsersRecord(@Context() context: Context) {
        this.userService.checkPermissions({ hasRole: ["admin"] }, context.get("user"));
        const [results] = await this.userService.findUsers();
        const users = results.map((x) => ({
            id: x.id,
            email: x.email,
            active: x.active,
            createdAt: x.createdAt,
            lastLogin: x.lastLogin,
        }));
        const parser = new Parser();
        return parser.parse(users);
    }
}
