import { Connection } from "typeorm";
import { connectDatabase } from "../helpers";
import * as dotenv from "dotenv";
import { Secrets } from "../../src/util/secrets";
import { prisma } from "../../src/clients/prisma";
import { TatumService } from "../../src/services/TatumService";
import { PrismaPromise } from "@prisma/client";
dotenv.config();

const tatumService = new TatumService();

(async () => {
    try {
        console.log("Preparing to update user balances.");
        await Secrets.initialize();
        const connection: Connection = await connectDatabase();
        const raiinmakerWalletId = "aef19da1-0710-493a-8967-65b56b67a955";
        const take = 50;
        let skip = 0;
        const totalCurrencies = await prisma.currency.count({
            where: { AND: [{ NOT: { depositAddress: null } }, { NOT: { walletId: raiinmakerWalletId } }] },
        });
        console.log(totalCurrencies);
        const paginatedLoop = Math.ceil(totalCurrencies / take);
        for (let pageIndex = 0; pageIndex < paginatedLoop; pageIndex++) {
            const currencies = await prisma.currency.findMany({
                where: { AND: [{ NOT: { depositAddress: null } }, { NOT: { walletId: raiinmakerWalletId } }] },
                take,
                skip,
            });
            const prismaTransactions: PrismaPromise<any>[] = [];
            const promiseArray: Promise<any>[] = [];
            for (const currency of currencies) {
                if (currency.walletId !== raiinmakerWalletId && currency.depositAddress) {
                    promiseArray.push(
                        tatumService.removeAddressFromAccount({
                            accountId: currency.tatumId,
                            address: currency.depositAddress!,
                        })
                    );
                    prismaTransactions.push(
                        prisma.currency.update({ where: { id: currency.id }, data: { depositAddress: null } })
                    );
                    console.log(
                        "PREPARING TO DELETE ADDRESS ---- ",
                        currency.id,
                        currency.tatumId,
                        currency.symbol,
                        currency.depositAddress
                    );
                }
            }
            console.log("PRISMA PROMISES ----.", prismaTransactions.length);
            console.log("TATUM TRANSACTIONS ----.", promiseArray.length);
            await Promise.all(promiseArray);
            await prisma.$transaction(prismaTransactions);
            skip += take;
        }

        await connection.close();
        process.exit(0);
    } catch (e) {
        console.log("ERROR:", e);
    }
})();
