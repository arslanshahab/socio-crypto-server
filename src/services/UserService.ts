import { Campaign, Prisma, User, Wallet, Currency, Token } from "@prisma/client";
import { Inject, Injectable } from "@tsed/di";
import { PrismaService } from ".prisma/client/entities";
import { BadRequest, Forbidden, NotFound } from "@tsed/exceptions";
import { isArray } from "lodash";
import { JWTPayload, RewardType } from "../types";
import { AddressService } from "./AddressService";
import { BSC, CacheKeys, COIIN, REWARD_AMOUNTS, SHARING_REWARD_LIMIT_PER_DAY, TransferType } from "../util/constants";
import { TatumClient } from "../clients/tatumClient";
import { createSubscriptionUrl } from "../util/tatumHelper";
import { WalletService } from "./WalletService";
import { WALLET_NOT_FOUND } from "../util/errors";
import { differenceInHours, subDays } from "date-fns";
import { TransferService } from "./TransferService";
import { TatumClientService } from "./TatumClientService";
import { createPasswordHash, prepareCacheKey } from "../util";
import { ProfileService } from "./ProfileService";
import { NotificationService } from "./NotificationService";
import { PlatformCache, UseCache } from "@tsed/common";
import { resetCacheKey } from "../util/index";
import { getCryptoAssestImageUrl } from "../util/index";
import { CurrencyService } from "./CurrencyService";
import { MarketDataService } from "./MarketDataService";

type Array2TrueMap<T> = T extends string[] ? { [idx in T[number]]: true } : undefined;

@Injectable()
export class UserService {
    @Inject()
    private prismaService: PrismaService;
    @Inject()
    private addressService: AddressService;
    @Inject()
    private walletService: WalletService;
    @Inject()
    private transferService: TransferService;
    @Inject()
    private tatumClientService: TatumClientService;
    @Inject()
    private profileService: ProfileService;
    @Inject()
    private notificationService: NotificationService;
    @Inject()
    private currencyService: CurrencyService;
    @Inject()
    private marketDataService: MarketDataService;
    @Inject()
    private cache: PlatformCache;

    /**
     * Retrieves a user object from a JWTPayload
     *
     * @param data the jwt payload
     * @param include additional relations to include with the user query
     * @returns the user object, with the requested relations included
     */

    public async findUserByContext<T extends (keyof Prisma.UserInclude)[] | Prisma.UserInclude | undefined>(
        data: JWTPayload,
        include?: T
    ) {
        return this.findUserById(data.userId, include);
    }

    /**
     * Retrieves a user object by its id
     *
     * @param data the jwt payload
     * @param include additional relations to include with the user query
     * @returns the user object, with the requested relations included
     */
    @UseCache({
        ttl: 600,
        refreshThreshold: 300,
        key: (args: any[]) => prepareCacheKey(CacheKeys.USER_BY_ID_SERVICE, args),
    })
    public async findUserById<T extends (keyof Prisma.UserInclude)[] | Prisma.UserInclude | undefined>(
        userId: string | Prisma.StringFilter,
        include?: T
    ) {
        return this.prismaService.user.findFirst<{
            where: Prisma.UserWhereInput;
            include: T extends unknown[] ? Array2TrueMap<T> : T;
        }>({
            where: { id: userId, deletedAt: null },
            include: (isArray(include)
                ? include?.reduce((acc, relation) => ({ ...acc, [relation]: true }), {})
                : include) as T extends unknown[] ? Array2TrueMap<T> : T,
        });
    }

    /**
     * Retrieves all user objects
     *
     * @param data the jwt payload
     * @param include additional relations to include with the user query
     * @returns the user object, with the requested relations included
     */
    public async findUsers<T extends (keyof Prisma.UserInclude)[] | Prisma.UserInclude | undefined>(
        params: { skip: number; take: number },
        include?: T
    ) {
        return this.prismaService.$transaction([
            this.prismaService.user.findMany<{
                where: Prisma.UserWhereInput;
                skip: number;
                take: number;
                // this type allows adding additional relations to result tpe
                include: T extends unknown[] ? Array2TrueMap<T> : T;
            }>({
                include: (isArray(include)
                    ? include?.reduce((acc, relation) => ({ ...acc, [relation]: true }), {})
                    : include) as T extends unknown[] ? Array2TrueMap<T> : T,
                skip: params.skip,
                take: params.take,
                where: { deletedAt: null },
            }),
            this.prismaService.user.count(),
        ]);
    }

    /**
     * Retrieves an admin object by its firebase id
     *
     * @param firebaseId the firebaseId of the admin
     * @param include additional relations to include with the admin query
     * @returns the admin object, with the requested relations included
     */
    public async findUserByFirebaseId<T extends Prisma.AdminInclude | undefined>(firebaseId: string, include?: T) {
        return this.prismaService.admin.findFirst<{
            where: Prisma.AdminWhereInput;
            // this type allows adding additional relations to result tpe
            include: T;
        }>({ where: { firebaseId }, include: include as T });
    }
    /**
     * Asserts that the user has the given permissions
     *
     * @param opts permissions to check for
     * @param context the user from the request context
     * @returns the user's role and company
     */
    public checkPermissions(opts: { hasRole?: string[]; restrictCompany?: string }, user: JWTPayload) {
        const { role, company } = user;
        if (opts.hasRole && (!role || !opts.hasRole.includes(role))) throw new Forbidden("Forbidden");
        if (opts.restrictCompany && company !== opts.restrictCompany) throw new Forbidden("Forbidden");
        if (role === "manager" && !company) throw new Forbidden("Forbidden, company not specified");
        return { role, company };
    }

    public async getAllDeviceTokens(action?: "campaignCreate" | "campaignUpdates") {
        const campaignType = action === "campaignCreate" ? { campaignCreate: true } : { campaignUpdates: true };
        const response = await this.prismaService.user.findMany({
            select: {
                profile: {
                    select: { deviceToken: true },
                },
            },
            where: {
                deletedAt: null,
                profile: {
                    AND: [
                        {
                            deviceToken: { not: null },
                        },
                        {
                            deviceToken: { not: undefined },
                        },
                        {
                            deviceToken: { not: "" },
                        },
                    ],
                },
                notification_settings: campaignType,
            },
        });
        const result = response.map((x) => x.profile?.deviceToken);
        return result;
    }
    /**
     * Retrieves the Coiin wallet for the given user, creating a new one if it doesn't exist
     *
     * @param user the user to retrieve the wallet for
     * @returns the wallet's address
     */
    @UseCache({
        ttl: 600,
        refreshThreshold: 300,
        key: (args: any[]) => prepareCacheKey(CacheKeys.USER_COIIN_ADDRESS_SERVICE, args),
    })
    public async getCoiinAddress(user: User & { wallet: Wallet }) {
        let currency = await this.tatumClientService.findOrCreateCurrency({
            symbol: COIIN,
            network: BSC,
            wallet: user.wallet,
        });
        if (!currency) throw new BadRequest("Currency not found for user.");
        if (!currency.depositAddress) {
            const availableAddress = await this.addressService.getAvailableAddress(
                { symbol: COIIN, network: BSC },
                user.wallet
            );
            if (!availableAddress) throw new Error("No custodial address available.");
            await TatumClient.assignAddressToAccount({
                accountId: currency.tatumId,
                address: availableAddress.address,
            });
            await TatumClient.createAccountIncomingSubscription({
                accountId: currency.tatumId,
                url: createSubscriptionUrl({ userId: user.id, accountId: currency.tatumId }),
            });
            currency = await this.currencyService.updateDepositAddress(currency.id, availableAddress.address);
        }
        return {
            symbol: COIIN,
            network: BSC,
            address: currency.depositAddress,
        };
    }

    public findUsersRecord(skip: number, take: number, filter: string) {
        return this.prismaService.$transaction([
            this.prismaService.user.findMany({
                where: filter
                    ? {
                          OR: [
                              {
                                  email: { contains: filter, mode: "insensitive" },
                                  deletedAt: null,
                              },
                              {
                                  deletedAt: null,
                                  profile: {
                                      OR: [
                                          {
                                              username: { contains: filter, mode: "insensitive" },
                                          },
                                          {
                                              email: { contains: filter, mode: "insensitive" },
                                          },
                                      ],
                                  },
                              },
                          ],
                      }
                    : { deletedAt: null },
                select: {
                    id: true,
                    email: true,
                    kycStatus: true,
                    createdAt: true,
                    lastLogin: true,
                    active: true,
                    social_post: {
                        select: { id: true, userId: true },
                    },
                    profile: {
                        select: {
                            username: true,
                            city: true,
                            state: true,
                            country: true,
                        },
                    },
                },
                skip,
                take,
            }),
            this.prismaService.user.count({}),
        ]);
    }

    public async updateUserStatus(userId: string, activeStatus: boolean) {
        await resetCacheKey(CacheKeys.USER_BY_ID_SERVICE, this.cache, [userId]);
        return await this.prismaService.user.update({
            where: { id: userId },
            data: { active: activeStatus },
        });
    }

    public async deleteUser(userId: string) {
        return await this.prismaService.user.update({
            where: { id: userId },
            data: { deletedAt: new Date() },
        });
    }

    public async recoverUser(userId: string) {
        return await this.prismaService.user.update({
            where: { id: userId },
            data: { deletedAt: undefined },
        });
    }

    public async transferCoiinReward(data: { user: User; type: RewardType; campaign?: Campaign }) {
        const { user, type, campaign } = data;
        const wallet = await this.walletService.findWalletByUserId(user.id);
        if (!wallet) throw new NotFound(WALLET_NOT_FOUND);
        let accountAgeInHours = 0,
            thisWeeksReward;
        if (type === "LOGIN_REWARD") accountAgeInHours = differenceInHours(new Date(), new Date(user.createdAt));
        if (type === "LOGIN_REWARD" || type === "PARTICIPATION_REWARD")
            thisWeeksReward = await this.transferService.getRewardForThisWeek(wallet.id, type);
        const amount = REWARD_AMOUNTS[type] || 0;
        if (
            (type === "LOGIN_REWARD" && accountAgeInHours > 24 && !thisWeeksReward) ||
            (type === "PARTICIPATION_REWARD" && !thisWeeksReward) ||
            (type === "SHARING_REWARD" &&
                (await this.transferService.getLast24HourRedemption(wallet.id, "SHARING_REWARD")) <
                    SHARING_REWARD_LIMIT_PER_DAY)
        ) {
            await resetCacheKey(CacheKeys.USER_PENDING_TRANSFERS, this.cache, [wallet.id, COIIN]);
            await this.transferService.newReward({
                walletId: wallet.id,
                action: type,
                status: "PENDING",
                symbol: COIIN,
                amount: amount.toString(),
                type: TransferType.CREDIT,
                campaign,
            });
        }
    }

    public async resetUserPassword(userId: string, email: string, password: string) {
        const hashedPassword = createPasswordHash({ email, password });
        return await this.prismaService.user.update({
            where: { id: userId },
            data: {
                password: hashedPassword,
            },
        });
    }

    public async getUserCount() {
        const currentDate = new Date();
        return this.prismaService.$transaction([
            this.prismaService.user.count(),
            this.prismaService.user.count({
                where: {
                    createdAt: {
                        gte: subDays(currentDate, 7),
                    },
                },
            }),
            this.prismaService.user.count({
                where: { active: false },
            }),
        ]);
    }

    public async findUserByEmail(email: string) {
        return await this.prismaService.user.findFirst({
            where: {
                email: { contains: email, mode: "insensitive" },
            },
        });
    }

    public async updateLastLogin(userId: string) {
        return await this.prismaService.user.update({ where: { id: userId }, data: { lastLogin: new Date() } });
    }

    public async initNewUser(email: string, username: string, password: string, referralCode?: string | null) {
        const user = await this.prismaService.user.create({
            data: {
                email: email.trim(),
                password: createPasswordHash({ email, password }),
                referralCode: referralCode ? referralCode : null,
            },
        });

        const wallet = await this.walletService.createWallet(user);
        await this.profileService.createProfile(user, username);
        await this.notificationService.createNotificationSetting(user.id);
        await this.tatumClientService.findOrCreateCurrency({ symbol: COIIN, network: BSC, wallet: wallet });
        return await user.id;
    }

    public async updateEmailPassword(email: string, password: string) {
        return await this.prismaService.user.create({
            data: { email, password },
        });
    }

    public async updatedUserEmail(email: string) {
        const user = this.findUserByEmail(email);
        if (!user) {
            const profile = await this.profileService.findProfileByEmail(email);
            if (profile) {
                await this.prismaService.user.update({
                    where: { id: profile.userId! },
                    data: { email: profile.email! },
                });
                await this.prismaService.profile.update({ where: { id: profile.id }, data: { email: "" } });
            }
        }
        return user;
    }

    public async getUserWalletBalances(wallet: Wallet & { currency: (Currency & { token: Token | null })[] }) {
        return await Promise.all(
            wallet.currency.map(async (item) => {
                const symbol = item.token?.symbol || "";
                const network = item.token?.network || "";
                const pendingBalance = await this.transferService.getPendingWalletBalances(wallet.id, symbol);
                const balance = (item.availableBalance || 0) + pendingBalance;
                return {
                    balance: balance.toString(),
                    symbol,
                    minWithdrawAmount: await this.marketDataService.getMinWithdrawableAmount(symbol),
                    usdBalance: await this.marketDataService.getTokenValueInUSD(symbol, balance),
                    imageUrl: getCryptoAssestImageUrl(symbol),
                    network,
                };
            })
        );
    }

    public async updateUserEmail(userId: string, email: string) {
        return await this.prismaService.user.update({
            where: { id: userId },
            data: { email },
        });
    }

    public async ifEmailExist(email: string) {
        return Boolean(await this.prismaService.user.findFirst({ where: { email } }));
    }
}
