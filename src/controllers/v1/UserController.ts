import { Get, Property, Returns } from "@tsed/schema";
import { Controller, Inject } from "@tsed/di";
import { Context, QueryParams } from "@tsed/common";
import { BadRequest } from "@tsed/exceptions";
import { NotificationSettings, Participant, Profile, SocialLink, User, Wallet, XoxodayOrder } from "@prisma/client";
import { TatumClient } from "../../clients/tatumClient";
import { UserService } from "../../services/UserService";
import { PaginatedVariablesModel, Pagination, SuccessArrayResult, SuccessResult } from "../../util/entities";
import { USER_NOT_FOUND } from "../../util/errors";
import { getCryptoAssestImageUrl, getUSDValueForCurrency, formatFloat, getMinWithdrawableAmount } from "../../util";
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

class BalanceResultModel {
    @Property() public readonly balance: string;
    @Property() public readonly symbol: string;
    @Property() public readonly minWithdrawAmount: number;
    @Property() public readonly usdBalance: number;
    @Property() public readonly imageUrl: string;
    @Property() public readonly network: string;
}

@Controller("/user")
export class UserController {
    @Inject()
    private userService: UserService;

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

        const currencies = await Promise.all(
            user.wallet?.currency.map(async (currencyItem): Promise<BalanceResultModel | null> => {
                if (!currencyItem.token) return null;

                const balance = await TatumClient.getAccountBalance(currencyItem.tatumId);
                const symbol = currencyItem.token.symbol;
                return {
                    balance: formatFloat(balance.availableBalance),
                    symbol: symbol,
                    minWithdrawAmount: await getMinWithdrawableAmount(symbol),
                    usdBalance: await getUSDValueForCurrency(
                        symbol.toLowerCase(),
                        parseFloat(balance.availableBalance)
                    ),
                    imageUrl: getCryptoAssestImageUrl(symbol),
                    network: currencyItem.token.network,
                };
            }) || []
        );

        return new SuccessResult(
            currencies.filter(<T>(r: T | null): r is T => !!r),
            Array
        );
    }

    @Get("/user-record")
    @(Returns(200, SuccessResult).Of(Pagination).Nested(UserResultModel))
    public async getUserRecord(@QueryParams() query: PaginatedVariablesModel, @Context() context: Context) {
        const { skip = 0, take = 10 } = query;
        const user = await this.userService.findUserByContext(context.get("user"));
        if (!user) throw new BadRequest(USER_NOT_FOUND);
        const [users, count] = await this.userService.findUsersRecord(skip, take);
        return new SuccessResult(new Pagination(users, count, UserResultModel), Pagination);
    }
}
