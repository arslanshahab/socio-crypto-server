import { Secrets } from "../../util/secrets";
import { Application } from "../../app";
import * as dotenv from "dotenv";
import { TatumClient } from "../../clients/tatumClient";
import { prisma, readPrisma } from "../../clients/prisma";
import { getCurrencyForTatum } from "../../util/tatumHelper";

dotenv.config();
const app = new Application();
console.log("APP instance created.");

const updateTatumBalances = async () => {
    const supportedTokens = await readPrisma.token.findMany({ where: { enabled: true } });
    for (let tokenIndex = 0; tokenIndex < supportedTokens.length; tokenIndex++) {
        const token = supportedTokens[tokenIndex];
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
                        `${foundAccount.id} ${foundAccount.tatumId} ${foundAccount.symbol} CURRENT: ${foundAccount.availableBalance} -- FETCHED: ${account.balance.availableBalance}`
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
    }
};

(async () => {
    console.log("Starting auto coiin transfer.");
    await Secrets.initialize();
    const connection = await app.connectDatabase();
    console.log("Secrets and connection initialized.");
    try {
        await updateTatumBalances();
    } catch (error) {
        console.log(error);
        await connection.close();
        console.log("DATABASE CONNECTION CLOSED WITH ERROR ----.");
        process.exit(0);
    }
    console.log("COMPLETED CRON TASKS ----.");
    await connection.close();
    console.log("DATABASE CONNECTION CLOSED ----.");
    process.exit(0);
})();
