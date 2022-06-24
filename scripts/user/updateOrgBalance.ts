import { Connection } from "typeorm";
import { connectDatabase } from "../helpers";
import * as dotenv from "dotenv";
import { Secrets } from "../../src/util/secrets";
import { prisma } from "../../src/clients/prisma";
import { TatumClient } from "../../src/clients/tatumClient";
dotenv.config();

(async () => {
    try {
        console.log("Preparing to update user balances...");
        await Secrets.initialize();
        const connection: Connection = await connectDatabase();
        const orgNames = ["raiinmaker"];
        const orgs = await prisma.org.findMany({ where: { name: { in: orgNames } } });
        for (let index = 0; index < orgs.length; index++) {
            const org = orgs[index];
            const wallet = await prisma.wallet.findFirst({ where: { orgId: org.id } });
            if (!wallet) throw new Error("Wallet not found for org");
            const currencies = await prisma.currency.findMany({ where: { walletId: wallet.id } });
            for (let index2 = 0; index2 < currencies.length; index2++) {
                const currency = currencies[index2];
                const balance = await TatumClient.getAccountBalance(currency.tatumId);
                console.log(
                    `${currency.symbol} CURRENT: ${currency.availableBalance} -- FETCHED: ${balance.availableBalance}`
                );
                await prisma.currency.update({
                    where: { id: currency.id },
                    data: {
                        accountBalance: parseFloat(balance.accountBalance),
                        availableBalance: parseFloat(balance.availableBalance),
                    },
                });
            }
        }
        console.log("Updated org balances!");
        await connection.close();
        process.exit(0);
    } catch (e) {
        console.log("ERROR:", e);
    }
})();
