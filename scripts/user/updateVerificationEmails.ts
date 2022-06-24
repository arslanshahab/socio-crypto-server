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
        const totalApps = await prisma.verification.count();
        const take = 100;
        let skip = 0;
        const paginatedLoop = Math.ceil(totalApps / take);
        for (let pageIndex = 0; pageIndex < paginatedLoop; pageIndex++) {
            const prismaTransactions = [];
            const apps = await prisma.verification.findMany({
                skip,
                take,
                orderBy: { createdAt: "desc" },
            });
            for (let appIndex = 0; appIndex < apps.length; appIndex++) {
                const app = apps[appIndex];
                if (app.email) {
                    console.log(app.email);
                    prismaTransactions.push(
                        prisma.verification.update({
                            where: { id: app?.id || "" },
                            data: { email: app.email.toLowerCase() },
                        })
                    );
                }
            }
            await prisma.$transaction(prismaTransactions);
            skip += take;
            console.log("-----------------------------");
        }
        await connection.close();
        process.exit(0);
    } catch (e) {
        console.log("ERROR:", e);
    }
})();
