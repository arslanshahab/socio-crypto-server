import { Org, Prisma, User, Wallet } from "@prisma/client";
import { Inject, Injectable } from "@tsed/di";
import { PrismaService } from ".prisma/client/entities";
import { BadRequest, Forbidden } from "@tsed/exceptions";
import { isArray } from "lodash";
import { JWTPayload } from "../types";
import { AddressService } from "./AddressService";
import { BSC, COIIN } from "../util/constants";
import { TatumClient } from "../clients/tatumClient";
import { createSubscriptionUrl } from "../util/tatumHelper";

type Array2TrueMap<T> = T extends string[] ? { [idx in T[number]]: true } : undefined;

@Injectable()
export class UserService {
    @Inject()
    private prismaService: PrismaService;
    @Inject()
    private addressService: AddressService;

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
    public async findUserById<T extends (keyof Prisma.UserInclude)[] | Prisma.UserInclude | undefined>(
        userId: string,
        include?: T
    ) {
        return this.prismaService.user.findUnique<{
            where: Prisma.UserWhereUniqueInput;
            // this type allows adding additional relations to result tpe
            include: T extends unknown[] ? Array2TrueMap<T> : T;
        }>({
            where: { id: userId },
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

    /**
     * Retrieves the Coiin wallet for the given user, creating a new one if it doesn't exist
     *
     * @param user the user to retrieve the wallet for
     * @returns the wallet's address
     */
    public async getCoiinAddress(user: User & { wallet: Wallet & { org: Org | null } }) {
        let currency = await this.addressService.findOrCreateCurrency(
            {
                symbol: COIIN,
                network: BSC,
            },
            user.wallet
        );
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
            currency = await this.addressService.updateDepositAddress(currency, availableAddress.address);
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
                              },
                              {
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
                    : {},
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
        return await this.prismaService.user.update({
            where: { id: userId },
            data: { active: activeStatus },
        });
    }

    public async getUserById(userId: string) {
        return await this.prismaService.user.findFirst({
            where: { id: userId },
            include: {
                wallet: {
                    include: {
                        currency: {
                            include: {
                                token: true,
                            },
                        },
                    },
                },
            },
        });
    }
}
