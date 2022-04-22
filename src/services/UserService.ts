import { Prisma } from "@prisma/client";
import { Inject, Injectable } from "@tsed/di";
import { PrismaService } from ".prisma/client/entities";
import { JWTPayload } from "../types";
import { Forbidden } from "@tsed/exceptions";
import { isArray } from "lodash";

type Array2TrueMap<T> = T extends string[] ? { [idx in T[number]]: true } : undefined;

@Injectable()
export class UserService {
    @Inject()
    private prismaService: PrismaService;

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

    public findUsersRecord(skip: number, take: number, filter: string) {
        const filterRecord: any = filter
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
            : {};
        return this.prismaService.$transaction([
            this.prismaService.user.findMany({
                select: {
                    id: true,
                    email: true,
                    kycStatus: true,
                    createdAt: true,
                    profile: {
                        select: {
                            username: true,
                            city: true,
                            state: true,
                            country: true,
                        },
                    },
                },
                where: filterRecord,

                skip,
                take,
            }),
            this.prismaService.user.count({}),
        ]);
    }
}
