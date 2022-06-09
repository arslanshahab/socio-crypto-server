import { Connection } from "typeorm";
import { connectDatabase } from "../helpers";
import * as dotenv from "dotenv";
import { User } from "../../src/models/User";
import { TatumClient } from "../../src/clients/tatumClient";
import { WalletCurrency } from "../../src/models/WalletCurrency";
import { Org } from "../../src/models/Org";
import { BSC, COIIN } from "../../src/util/constants";
import { BN } from "../../src/util";
import { Secrets } from "../../src/util/secrets";
dotenv.config();

(async () => {
    try {
        console.log("Starting coiin migration to tatum");
        await Secrets.initialize();
        const connection: Connection = await connectDatabase();
        const users = await User.find({
            relations: ["wallet", "wallet.walletCurrency", "wallet.currency"],
        });
        console.log("TOTAL USERS, ---- ", users.length);
        const raiinmakerCoiinAccount = await Org.getCurrencyForRaiinmaker({ symbol: COIIN, network: BSC });
        const raiinmakerCoiinBalance = await TatumClient.getAccountBalance(raiinmakerCoiinAccount.tatumId);
        let totalCoiinToTransfer = new BN(0);
        const walletIds = users.map((user) => user.wallet.id);
        const [totalCoiins] = await WalletCurrency.getTotalCoiinBalance(walletIds);
        totalCoiinToTransfer = totalCoiinToTransfer.plus(totalCoiins.totalCoiins);
        console.log("TOTAL COIIN TO TRANSFER --- ", totalCoiinToTransfer.toNumber());
        console.log("AVAILABLE COIIN BALANCE --- ", parseFloat(raiinmakerCoiinBalance.availableBalance));
        if (parseFloat(raiinmakerCoiinBalance?.availableBalance) <= 0)
            throw new Error("Not enough balance to initiate coiin transfer");

        const legderPromises = [];
        for (let index = 0; index < users.length; index++) {
            const user = users[index];
            const coiinCurrency = user.wallet.currency.find((item) => item.symbol.toUpperCase() === COIIN);
            if (!coiinCurrency) {
                legderPromises.push(
                    TatumClient.findOrCreateCurrency({ symbol: COIIN, network: BSC, walletId: user.wallet.id })
                );
                console.log("creating legder account promise", index, user.id);
            }
        }

        await Promise.all(legderPromises);

        for (let index = 0; index < users.length; index++) {
            const user = users[index];
            const userCoiinAccount = user.wallet.currency.find((item) => item.symbol.toUpperCase() === COIIN);
            const coiinWalletCurrency = user.wallet.walletCurrency.find((item) => item.type.toUpperCase() === COIIN);
            if (
                userCoiinAccount?.tatumId &&
                coiinWalletCurrency?.balance &&
                coiinWalletCurrency?.balance.toNumber() > 0
            ) {
                await TatumClient.transferFunds({
                    senderAccountId: raiinmakerCoiinAccount.tatumId,
                    recipientAccountId: userCoiinAccount?.tatumId,
                    amount: coiinWalletCurrency?.balance.toString(),
                    recipientNote: "COIIN_ADJUSTMENT_ON_TATUM",
                });
                console.log(
                    `${coiinWalletCurrency?.balance.toString()} coiin transferred to userID: ${user.id} -- ${index}`
                );
                coiinWalletCurrency.balance = new BN(0);
                await coiinWalletCurrency?.save();
            }
        }

        await connection.close();
        process.exit(0);
    } catch (e) {
        console.log("ERROR:", e);
    }
})();
