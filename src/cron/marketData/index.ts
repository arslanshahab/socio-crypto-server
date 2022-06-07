import { Secrets } from "../../util/secrets";
import { Application } from "../../app";
import * as dotenv from "dotenv";
import { doFetch, RequestData } from "../../util/fetchRequest";
import { MarketData } from "../../models/MarketData";

dotenv.config();
const app = new Application();
console.log("APP instance created.");

(async () => {
    console.log("Updating market data.");
    await Secrets.initialize();
    const connection = await app.connectDatabase();
    console.log("Secrets and connection initialized.");
    try {
        const requestData: RequestData = {
            method: "GET",
            url: `https://api.coingecko.com/api/v3/coins/markets?vs_currency=usd&order=market_cap_desc&per_page=250&page=1&sparkline=false`,
        };
        const marketData = await doFetch(requestData);
        for (const item of marketData) {
            let marketSymbol;
            marketSymbol = await MarketData.findOne({ where: { symbol: item.symbol } });
            if (marketSymbol) {
                marketSymbol.price = parseFloat(item.current_price);
            } else {
                marketSymbol = new MarketData();
                marketSymbol.symbol = item.symbol.toUpperCase();
                marketSymbol.price = parseFloat(item.current_price);
            }
            await marketSymbol.save();
        }
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
