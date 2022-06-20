import { Connection } from "typeorm";
import { connectDatabase } from "../helpers";
import * as dotenv from "dotenv";
import { Secrets } from "../../src/util/secrets";
import { prisma } from "../../src/clients/prisma";
import { TatumClient } from "../../src/clients/tatumClient";
dotenv.config();

(async () => {
    try {
        console.log("Preparing to user balances.");
        await Secrets.initialize();
        const connection: Connection = await connectDatabase();
        const emails = ["abinokhaunopromise7@gmail.com", "yhant422@gmail.com", "hayriye_23_86@hotmail.com"];
        for (const email of emails) {
            const user = await prisma.user.findFirst({ where: { email: email } });
            if (!user) throw new Error("User not found.");
            const wallet = await prisma.wallet.findFirst({ where: { userId: user.id } });
            if (!wallet) throw new Error("Wallet not found.");
            const currencies = await prisma.currency.findMany({ where: { walletId: wallet.id } });
            for (const currency of currencies) {
                const balance = await TatumClient.getAccountBalance(currency.tatumId);
                await prisma.currency.update({
                    where: { id: currency.id },
                    data: {
                        accountBalance: parseFloat(balance.accountBalance),
                        availableBalance: parseFloat(balance.availableBalance),
                    },
                });
            }
        }
        console.log("BALANCES UPDATED FOR ALL USERS: ", emails.length);
        await connection.close();
        process.exit(0);
    } catch (e) {
        console.log("ERROR:", e);
    }
})();
