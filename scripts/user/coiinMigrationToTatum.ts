import { Connection } from "typeorm";
import { connectDatabase } from "../helpers";
import * as dotenv from "dotenv";
import { User } from "../../src/models/User";
import { TatumClient } from "../../src/clients/tatumClient";
import { WalletCurrency } from "../../src/models/WalletCurrency";
import { Org } from "../../src/models/Org";
import { COIIN } from "../../src/util/constants";
import { BN } from "../../src/util";
import { Secrets } from "../../src/util/secrets";
dotenv.config();

(async () => {
    try {
        console.log("Starting coiin migration to tatum");
        await Secrets.initialize();
        console.log("api key", Secrets.tatumApiKey);
        const connection: Connection = await connectDatabase();
        const users = await User.find({ relations: ["wallet"] });
        console.log("total users, ---- ", users.length);
        const raiinmakerCoiinAccount = await Org.getCurrencyForRaiinmaker(COIIN);
        const raiinmakerCoiinBalance = await TatumClient.getAccountBalance(raiinmakerCoiinAccount.tatumId);
        let totalCoiinToTransfer = new BN(0);
        for (let index = 0; index < users.length; index++) {
            const user = users[index];
            const walletCurrency = await WalletCurrency.findOne({
                where: { type: COIIN.toLowerCase(), wallet: user.wallet },
            });
            totalCoiinToTransfer = totalCoiinToTransfer.plus(walletCurrency?.balance || 0);
        }
        console.log("TOTAL COIIN TO TRANSFER --- ", totalCoiinToTransfer.toNumber());
        console.log("AVAILABLE COIIN BALANCE --- ", raiinmakerCoiinBalance.availableBalance);
        if (parseFloat(raiinmakerCoiinBalance.availableBalance) <= 0)
            throw new Error("Not enough balance to initiate coiin transfer");
        for (let index = 0; index < users.length; index++) {
            const user = users[index];
            const userCoiinAccount = await TatumClient.findOrCreateCurrency(COIIN, user.wallet);
            const walletCurrency = await WalletCurrency.findOne({
                where: { type: COIIN.toLowerCase(), wallet: user.wallet },
            });
            if (walletCurrency?.balance && walletCurrency.balance.toNumber() > 0) {
                await TatumClient.transferFunds({
                    senderAccountId: raiinmakerCoiinAccount.tatumId,
                    recipientAccountId: userCoiinAccount.tatumId,
                    amount: walletCurrency.balance.toString(),
                    recipientNote: "COIIN_ADJUSTMENT_ON_TATUM",
                });
                user.updateCoiinBalance("SUBTRACT", walletCurrency.balance.toNumber());
                console.log(`${walletCurrency.balance} coiin transferred to userID: ${user.id}`);
            }
        }
        await connection.close();
        process.exit(0);
    } catch (e) {
        console.log("ERROR:", e);
    }
})();
