import { Connection } from "typeorm";
import { connectDatabase } from "../helpers";
import * as dotenv from "dotenv";
import { Secrets } from "../../src/util/secrets";
import { prisma, readPrisma } from "../../src/clients/prisma";
import { UserService } from "../../src/services/UserService";
import { PrismaPromise } from "@prisma/client";
dotenv.config();
const userService = new UserService();

(async () => {
    try {
        console.log("Preparing to generate user promo codes.");
        await Secrets.initialize();
        const connection: Connection = await connectDatabase();
        const take = 50;
        let skip = 0;
        const totalUsers = await readPrisma.user.count({ where: { promoCode: null } });
        console.log("TOTAL USERS: ", totalUsers);
        const paginatedLoop = Math.ceil(totalUsers / take);
        for (let pageIndex = 0; pageIndex < paginatedLoop; pageIndex++) {
            const users = await prisma.user.findMany({ where: { promoCode: null }, take, skip });
            const prismaTransactions: PrismaPromise<any>[] = [];
            for (const user of users) {
                if (!user.promoCode) {
                    let promoCode = await userService.getUniquePromoCode();
                    prismaTransactions.push(prisma.user.update({ where: { id: user.id }, data: { promoCode } }));
                    console.log("PROMO CODE GENERATED FOR USER: ", user.id, promoCode);
                }
            }
            console.log("PROMISE LENGTH ", prismaTransactions.length);
            await prisma.$transaction(prismaTransactions);
            skip += take;
        }
        await connection.close();
        process.exit(0);
    } catch (e) {
        console.log("ERROR:", e);
    }
})();
