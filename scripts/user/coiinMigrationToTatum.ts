import { Connection } from "typeorm";
import { connectDatabase } from "../helpers";
import * as dotenv from "dotenv";
import { User } from "../../src/models/User";
import { TatumClient } from "../../src/clients/tatumClient";
import { WalletCurrency } from "../../src/models/WalletCurrency";
import { Org } from "../../src/models/Org";
import { COIIN, RAIINMAKER_ORG_NAME } from "../../src/util/constants";
dotenv.config();

(async () => {
    try {
        console.log("Starting coiin migration to tatum");
        const connection: Connection = await connectDatabase();
        const users = await User.find({ relations: ["wallet"] });
        console.log("total users, ---- ", users.length);
        for (let index = 0; index < users.length; index++) {
            const user = users[index];
            const coiinAccount = await TatumClient.findOrCreateCurrency(COIIN, user.wallet);
            const walletCurrency = await WalletCurrency.findOne({
                where: { type: COIIN.toLowerCase(), wallet: user.wallet },
            });
            const raiinmakerCoiinAccount = await Org.getCurrencyForRaiinmaker(COIIN);
        }
        await connection.close();
        process.exit(0);
    } catch (e) {
        console.log("ERROR:", e);
    }
})();
