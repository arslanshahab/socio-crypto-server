import { Connection } from "typeorm";
import { connectDatabase } from "../helpers";
import * as dotenv from "dotenv";
import { Secrets } from "../../src/util/secrets";
import { prisma } from "../../src/clients/prisma";
dotenv.config();

(async () => {
    try {
        console.log("Preparing to convert username to lowercase...");
        await Secrets.initialize();
        const connection: Connection = await connectDatabase();
        const totalUsers = await prisma.user.count();
        const take = 50;
        let skip = 0;
        const paginatedLoop = Math.ceil(totalUsers / take);
        for (let pageIndex = 0; pageIndex < paginatedLoop; pageIndex++) {
            const prismaTransactions = [];
            const users = await prisma.user.findMany({
                include: { profile: true },
                skip,
                take,
                orderBy: { createdAt: "desc" },
            });
            for (let userIndex = 0; userIndex < users.length; userIndex++) {
                const profile = users[userIndex].profile;
                if (profile?.username) {
                    console.log(profile.username);
                    prismaTransactions.push(
                        prisma.profile.update({
                            where: { id: profile?.id || "" },
                            data: { username: profile?.username.toLowerCase() },
                        })
                    );
                }
            }
            await prisma.$transaction(prismaTransactions);
            skip += take;
        }
        await connection.close();
        process.exit(0);
    } catch (e) {
        console.log("ERROR:", e);
    }
})();
