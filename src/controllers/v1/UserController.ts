import { Get, Returns } from "@tsed/schema";
import { Controller, Inject } from "@tsed/di";
import { Context, QueryParams } from "@tsed/common";
import { BadRequest } from "@tsed/exceptions";
import { NotificationSettings, Participant, Profile, SocialLink, User, Wallet, XoxodayOrder } from "@prisma/client";
import { UserService } from "../../services/UserService";
import { PaginatedVariablesModel, Pagination, SuccessResult } from "../../util/entities";
import { USER_NOT_FOUND } from "../../util/errors";
import { UserResultModel } from "../../models/RestModels";

const userResultRelations = [
    "profile" as const,
    "social_link" as const,
    "participant" as const,
    "notification_settings" as const,
    "wallet" as const,
    "xoxoday_order" as const,
];

function getUserResultModel(
    user: User & {
        profile: Profile | null;
        social_link: SocialLink[];
        participant: Participant[];
        notification_settings: NotificationSettings | null;
        wallet: Wallet | null;
        xoxoday_order: XoxodayOrder[];
    }
) {
    const userResult: UserResultModel = user;
    if (userResult.profile) userResult.profile.hasRecoveryCodeSet = !!user.profile?.recoveryCode;

    return userResult;
}

@Controller("/user")
export class UserController {
    @Inject()
    private userService: UserService;

    @Get("/me")
    @(Returns(200, SuccessResult).Of(UserResultModel))
    public async me(@Context() context: Context) {
        const user = await this.userService.findUserByContext(context.get("user"), userResultRelations);
        if (!user) throw new BadRequest(USER_NOT_FOUND);

        return new SuccessResult(getUserResultModel(user), UserResultModel);
    }

    @Get("/")
    @(Returns(200, SuccessResult).Of(Pagination).Nested(UserResultModel))
    public async list(@QueryParams() query: PaginatedVariablesModel, @Context() context: Context) {
        this.userService.checkPermissions({ hasRole: ["admin"] }, context.get("user"));
        const { skip = 0, take = 10 } = query;
        const [results, total] = await this.userService.findUsers({ skip, take }, userResultRelations);

        return new SuccessResult(new Pagination(results.map(getUserResultModel), total, UserResultModel), Pagination);
    }

    @Get("/participation-keywords")
    @(Returns(200, SuccessResult).Of(Array).Nested(String))
    public async getParticipationKeywords(@Context() context: Context) {
        const user = await this.userService.findUserByContext(context.get("user"), {
            participant: {
                include: {
                    campaign: true,
                },
            },
        });
        if (!user) throw new Error(USER_NOT_FOUND);
        const keywords = new Set<string>();
        try {
            user.participant.forEach((p) =>
                (JSON.parse(p.campaign.keywords) as string[]).forEach((k) => keywords.add(k))
            );
        } catch (e) {
            context.logger.error(e);
        }
        return [...keywords];
    }
}
