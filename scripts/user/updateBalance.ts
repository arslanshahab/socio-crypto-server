import { Connection } from "typeorm";
import { connectDatabase } from "../helpers";
import * as dotenv from "dotenv";
import { Secrets } from "../../src/util/secrets";
import { prisma, readPrisma } from "../../src/clients/prisma";
import { TatumClient } from "../../src/clients/tatumClient";
import { getCurrencyForTatum } from "../../src/util/tatumHelper";
import { ADA, BSC } from "../../src/util/constants";
dotenv.config();

(async () => {
    try {
        console.log("Preparing to update user balances.");
        await Secrets.initialize();
        const connection: Connection = await connectDatabase();
        const token = await readPrisma.token.findFirst({ where: { symbol: ADA, network: BSC } });
        if (!token) throw new Error("Token not found");
        const tatumSymbol = getCurrencyForTatum(token);
        const totalAccountForSymbol = (await TatumClient.getTotalAccounts(tatumSymbol)).total;
        console.log(`TOTAL ACCOUNTS FOR: ${tatumSymbol} ${totalAccountForSymbol}`);
        const pageSize = 50;
        let page = 0;
        const paginatedLoop = Math.ceil(totalAccountForSymbol / pageSize);
        for (let pageIndex = 0; pageIndex < paginatedLoop; pageIndex++) {
            const accountList: any[] = await TatumClient.getAccountList(tatumSymbol, page, pageSize);
            const prismaTransactions = [];
            console.log("FETCHED ACCOUNT LIST FOR PAGE: ", page, tatumSymbol);
            for (let index = 0; index < accountList.length; index++) {
                const account = accountList[index];
                const foundAccount = await readPrisma.currency.findFirst({
                    where: { tatumId: account.id, symbol: account.currency },
                });
                if (foundAccount) {
                    console.log(
                        `${tatumSymbol} CURRENT: ${foundAccount.availableBalance} -- FETCHED: ${account.balance.availableBalance}`
                    );
                    prismaTransactions.push(
                        prisma.currency.update({
                            where: { id: foundAccount.id },
                            data: {
                                accountBalance: parseFloat(account.balance.accountBalance),
                                availableBalance: parseFloat(account.balance.availableBalance),
                            },
                        })
                    );
                }
            }
            await prisma.$transaction(prismaTransactions);
            page += 1;
        }
        await connection.close();
        process.exit(0);
    } catch (e) {
        console.log("ERROR:", e);
    }
})();
