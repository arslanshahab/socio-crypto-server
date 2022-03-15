import { Connection } from "typeorm";
import { connectDatabase } from "../helpers";
import * as dotenv from "dotenv";
import { Secrets } from "../../src/util/secrets";
import { SYMBOL_TO_CHAIN, SYMBOL_TO_CONTRACT } from "../../src/util/tatumHelper";
import { SupportedToken } from "../../src/models/SupportedToken";
import { Currency } from "../../src/models/Currency";
import { Campaign } from "../../src/models/Campaign";
import { Wallet } from "../../src/models/Wallet";
dotenv.config();

(async () => {
    try {
        console.log("Starting currency migration to tatum");
        await Secrets.initialize();
        const connection: Connection = await connectDatabase();
        const symbols = Object.keys(SYMBOL_TO_CHAIN);

        for (let index = 0; index < symbols.length; index++) {
            const item = symbols[index];
            const sp = new SupportedToken();
            sp.symbol = item;
            sp.network = SYMBOL_TO_CHAIN[item];
            sp.contractAddress = SYMBOL_TO_CONTRACT[item];
            await sp.save();
        }

        const currencies = await Currency.find();
        for (let index = 0; index < currencies.length; index++) {
            const currency = currencies[index];
            const token = await SupportedToken.findOne({ where: { symbol: currency.symbol } });
            if (token) {
                currency.token = token;
                await currency.save();
            }
        }

        const campaigns = await Campaign.find({ relations: ["org"] });
        for (let index = 0; index < campaigns.length; index++) {
            const campaign = campaigns[index];
            const wallet = await Wallet.findOne({ where: { org: campaign.org } });
            const currency = await Currency.findOne({ where: { symbol: campaign.symbol, wallet } });
            if (currency) {
                campaign.currency = currency;
                await campaign.save();
            }
        }

        await connection.close();
        process.exit(0);
    } catch (e) {
        console.log("ERROR:", e);
    }
})();
