import { Enum, Get, Put, Property, Required, Returns, Post, Delete } from "@tsed/schema";
import { Controller, Inject } from "@tsed/di";
import { BodyParams, Context, QueryParams } from "@tsed/common";
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
    MISSING_PARAMS,
    NOTIFICATION_SETTING_NOT_FOUND,
    PARTICIPANT_NOT_FOUND,
    USER_NOT_FOUND,
    WALLET_NOT_FOUND,
} from "../../util/errors";
import {
    BooleanResultModel,
    CampaignIdModel,
    ParticipantMetricsResultModel,
    UserDailyParticipantMetricResultModel,
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
import { TransferAction } from "../../util/constants";
import { SocialService } from "../../services/SocialService";
import { getBalance } from "../helpers";
import { CampaignService } from "../../services/CampaignService";
import { ParticipantService } from "../../services/ParticipantService";
import { TatumClientService } from "../../services/TatumClientService";
import { HourlyCampaignMetricsService } from "../../services/HourlyCampaignMetricsService";

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
        if (!user) throw new BadRequest(USER_NOT_FOUND);
        const currencies = await getBalance(user);
        return new SuccessArrayResult(
            currencies.filter(<T>(r: T | null): r is T => !!r),
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
        const user = await this.userService.findUserByContext(context.get("user"), {
            wallet: { include: { org: true } },
        });
        if (!user) throw new BadRequest(USER_NOT_FOUND);
        const wallet = user.wallet;
        if (!wallet) throw new BadRequest(WALLET_NOT_FOUND);
        return new SuccessResult(await this.userService.getCoiinAddress({ ...user, wallet }), AddressResultModel);
    }

    @Get("/me/transfer-history")
    @(Returns(200, SuccessResult).Of(Pagination).Nested(TransferResultModel))
    public async getTransferHistory(@QueryParams() query: TransferHistoryVariablesModel, @Context() context: Context) {
        const user = await this.userService.findUserByContext(context.get("user"), {
            wallet: { include: { transfer: true, wallet_currency: true } },
        });
        if (!user) throw new BadRequest(USER_NOT_FOUND);
        if (!user.wallet) throw new BadRequest(WALLET_NOT_FOUND);
        const [data, count] = await this.transferService.findByWallet({
            ...query,
            walletId: user.wallet.id,
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

    @Get("/user-balances")
    @(Returns(200, SuccessResult).Of(UserWalletResultModel))
    public async getUserBalances(@QueryParams() query: { userId: string }, @Context() context: Context) {
        const user = await this.userService.getUserById(query.userId);
        if (!user) throw new BadRequest(USER_NOT_FOUND);
        const currencies = await getBalance(user);
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
    public async participate(
        @QueryParams() query: { campaignId: string; email?: string },
        @Context() context: Context
    ) {
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

    @Delete()
    @(Returns(200, SuccessResult).Of(BooleanResultModel))
    public async deleteUser(@Context() context: Context) {
        const user = await this.userService.findUserByContext(context.get("user"));
        if (!user) throw new NotFound(USER_NOT_FOUND);
        await this.userService.deleteUser(user.id);
        const result = { message: "User account deleted." };
        return new SuccessResult(result, UpdatedResultModel);
    }
}
