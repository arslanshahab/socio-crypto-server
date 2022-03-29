import { Prisma } from "@prisma/client";
import { Inject, Injectable } from "@tsed/di";
import { PrismaService } from ".prisma/client/entities";
import { JWTPayload } from "../types";

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
    public async findUserByContext<T extends (keyof Prisma.UserInclude)[] | undefined>(data: JWTPayload, include?: T) {
        const { userId } = data;
        return this.prismaService.user.findUnique<{
            where: Prisma.UserWhereUniqueInput;
            // this type allows adding additional relations to result tpe
            include: Array2TrueMap<T>;
        }>({
            where: {
                ...(userId && { id: userId }),
            },
            include: include?.reduce((acc, relation) => ({ ...acc, [relation]: true }), {}) as Array2TrueMap<T>,
        });
    }
}
