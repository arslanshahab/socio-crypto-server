import { Prisma } from "@prisma/client";
import { Injectable } from "@tsed/di";
import { prisma } from "../clients/prisma";
import { JWTPayload } from "../types";

type Array2TrueMap<T> = T extends string[] ? { [idx in T[number]]: true } : undefined;

@Injectable()
export class UserService {
    /**
     * Retrieves a user object from a JWTPayload
     *
     * @param data the jwt payload
     * @param include additional relations to include with the user query
     * @returns the user object, with the requested relations included
     */
    public async findUserByContext<T extends (keyof Prisma.userInclude)[] | undefined>(data: JWTPayload, include?: T) {
        const { id, userId } = data;
        return prisma.user.findUnique<{
            where: Prisma.userWhereUniqueInput;
            // this type allows adding additional relations to result tpe
            include: Array2TrueMap<T>;
        }>({
            where: {
                ...(id && { identityId: id }),
                ...(userId && { id: userId }),
            },
            include: include?.reduce((acc, relation) => ({ ...acc, [relation]: true }), {}) as Array2TrueMap<T>,
        });
    }
}
