import { Get, Property, Put, Returns } from "@tsed/schema";
import { Controller, Inject } from "@tsed/di";
import { BodyParams, Context, QueryParams } from "@tsed/common";
import { Participant, Profile, SocialLink, User, Wallet } from "@prisma/client";
import { BadRequest, NotFound } from "@tsed/exceptions";
import { UserService } from "../../services/UserService";
import {
    PaginatedVariablesModel,
    PaginatedVariablesFilteredModel,
    Pagination,
    SuccessArrayResult,
    SuccessResult,
} from "../../util/entities";
import { NOTIFICATION_SETTING_NOT_FOUND, USER_NOT_FOUND } from "../../util/errors";
import { DailyParticipantMetricService } from "../../services/DailyParticipantMetricService";
import {
    BalanceResultModel,
    NotificationSettingsResultModel,
    ProfileResultModel,
    UpdatedResultModel,
    UserRecordResultModel,
    UserResultModel,
    UserWalletResultModel,
    DailyParticipantMetricResultModel
} from "../../models/RestModels";
import { NotificationService } from "../../services/NotificationService";
import { getBalance } from "../helpers";

const userResultRelations = ["profile" as const, "social_link" as const, "participant" as const, "wallet" as const];

function getProfileResultModel(profile: Profile): ProfileResultModel {
    return {
        ...profile,
        hasRecoveryCodeSet: !!profile?.recoveryCode,
        interests: JSON.parse(profile.interests),
        values: JSON.parse(profile.values),
    };
}

function getUserResultModel(
    user: User & {
        profile: Profile | null;
        social_link: SocialLink[];
        participant: Participant[];
        wallet: Wallet | null;
    }
): UserResultModel {
    return {
        ...user,
        profile: user.profile ? getProfileResultModel(user.profile) : null,
    };
}
class UserQueryVariables {
    @Property() public readonly today: boolean;
    // @Property() public readonly userRelated: boolean;
}

@Controller("/user")
export class UserController {
    @Inject()
    private userService: UserService;
    @Inject()
    private dailyParticipantMetricService: DailyParticipantMetricService;
    @Inject()
    private notificationService: NotificationService;
    
    @Get("/")
    @(Returns(200, SuccessResult).Of(Pagination).Nested(UserResultModel))
    public async list(@QueryParams() query: PaginatedVariablesModel, @Context() context: Context) {
        this.userService.checkPermissions({ hasRole: ["admin"] }, context.get("user"));
        const { skip = 0, take = 10 } = query;
        const [results, total] = await this.userService.findUsers({ skip, take }, userResultRelations);

        return new SuccessResult(new Pagination(results.map(getUserResultModel), total, UserResultModel), Pagination);
    }

    @Get("/me")
    @(Returns(200, SuccessResult).Of(UserResultModel))
    public async me(@Context() context: Context) {
        const user = await this.userService.findUserByContext(context.get("user"), userResultRelations);
        if (!user) throw new BadRequest(USER_NOT_FOUND);

        return new SuccessResult(getUserResultModel(user), UserResultModel);
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
    @(Returns(200, SuccessResult).Of(DailyParticipantMetricResultModel))
    public async getUserMetrics(@QueryParams() query: UserQueryVariables, @Context() context: Context) {
        const { today } = query;
        const user = await this.userService.findUserByContext(context.get("user"));
        if (!user) throw new BadRequest(USER_NOT_FOUND);
        const result = await this.dailyParticipantMetricService.getSortedByUserId(user.id, today);
        return new SuccessResult(new Pagination(result, result.length, DailyParticipantMetricResultModel), Pagination);
    }
   
    @Get("/users-record")
    @(Returns(200, SuccessResult).Of(Pagination).Nested(UserResultModel))
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
}
