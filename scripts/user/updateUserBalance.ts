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
        const emails = ["ray@raiinmaker.com"];
        const users = await prisma.user.findMany({ where: { email: { in: emails } } });
        for (let index = 0; index < users.length; index++) {
            const user = users[index];
            const wallet = await prisma.wallet.findFirst({ where: { userId: user.id } });
            if (!wallet) throw new Error("Wallet not found for user");
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
        console.log("Updated user balances!");
        await connection.close();
        process.exit(0);
    } catch (e) {
        console.log("ERROR:", e);
    }
})();
