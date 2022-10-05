import { Secrets } from "../../util/secrets";
import { Application } from "../../app";
import * as dotenv from "dotenv";
import { doFetch, RequestData } from "../../util/fetchRequest";
import { prisma, readPrisma } from "../../clients/prisma";
import { SlackClient } from "../../clients/slack";
import { BinanceCoiinsApiTypes, BinanceNetworkList } from "types.ts";
import { TokenService } from "../../services/TokenService";

dotenv.config();
const app = new Application();
console.log("APP instance created.");
const tokenService = new TokenService();

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
        const list = await doFetch(requestData);
        for (const item of list) {
            const marketSymbol = await readPrisma.marketData.findFirst({
                where: { symbol: item.symbol.toUpperCase() },
            });
            if (marketSymbol?.id) {
                console.log("UPDATING FOR SYMBOL ", marketSymbol?.symbol);
                await prisma.marketData.update({
                    where: { id: marketSymbol.id },
                    data: { price: parseFloat(item.current_price) },
                });
            } else {
                await prisma.marketData.create({
                    data: {
                        symbol: item.symbol.toUpperCase(),
                        price: parseFloat(item.current_price),
                    },
                });
            }
        }
    } catch (error) {
        console.log(error);
        await SlackClient.sendNotification({ name: "Market Data Cron", error: error });
        console.log("EXITING BECAUSE OF AN ERROR ----.");
        await connection.close();
        console.log("DATABASE CONNECTION CLOSED ----.");
        process.exit(0);
    }

    // Network withdraw fee
    console.log("NETWORK FEE START----.");
    const tokens = await tokenService.getEnabledTokens();
    const requestData: RequestData = {
        method: "GET",
        url: `https://www.binance.com/bapi/capital/v1/public/capital/getNetworkCoinAll`,
    };
    const { data } = await doFetch(requestData);
    const networkList = data.flatMap((x: BinanceCoiinsApiTypes) => x.networkList);
    const withdrawFee: BinanceNetworkList[] = networkList.map((x: BinanceNetworkList) => ({
        coin: x.coin,
        network: x.network,
        withdrawFee: x.withdrawFee,
    }));
    const networkRecord = [];
    for (const token of tokens) {
        const result = withdrawFee.find((x) => x.coin == token.symbol && x.network == token.network);
        if (result) networkRecord.push(result);
    }
    for (const network of networkRecord) {
        const marketSymbol = await readPrisma.marketData.findFirst({
            where: { symbol: network.coin.toUpperCase(), network: network.network.toUpperCase() },
        });
        if (marketSymbol?.id) {
            await prisma.marketData.update({
                where: { id: marketSymbol.id },
                data: { networkFee: network.withdrawFee },
            });
        } else {
            await prisma.marketData.create({
                data: {
                    symbol: network.coin.toUpperCase(),
                    network: network.network.toUpperCase(),
                    networkFee: network.withdrawFee,
                },
            });
        }
    }
    console.log("COMPLETED CRON TASKS ----.");
    await connection.close();
    console.log("DATABASE CONNECTION CLOSED ----.");
    process.exit(0);
})();
