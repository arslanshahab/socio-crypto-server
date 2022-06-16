import { Secrets } from "../../util/secrets";
import { Application } from "../../app";
import * as dotenv from "dotenv";
import { Firebase } from "../../clients/firebase";
import { COIIN, BSC, RAIINMAKER_ORG_NAME, COIIN_ALERT_TRIGGER_LIMIT, TransferStatus } from "../../util/constants";
import { SesClient } from "../../clients/ses";
import { BatchTransferPayload, TatumClient } from "../../clients/tatumClient";
import { prisma } from "../../clients/prisma";
import { Currency } from "@prisma/client";
import { getCurrencyForTatum } from "../../util/tatumHelper";

dotenv.config();
const app = new Application();
console.log("APP instance created.");

const fixFailedCoiinTransfers = async (raiinmakerCoiinCurrency: Currency) => {
    const failedCoiinTransfersCount = await prisma.transfer.count({
        where: {
            status: { in: ["FAILED", "PENDING"] },
            currency: COIIN,
            action: { in: ["SHARING_REWARD", "PARTICIPATION_REWARD", "LOGIN_REWARD"] },
        },
    });
    console.log("FAILED/PENDING COIIN TRANSFERS: ", failedCoiinTransfersCount);
    if (failedCoiinTransfersCount) {
        const take = 200;
        let skip = 0;
        const paginatedLoop = Math.ceil(failedCoiinTransfersCount / take);
        for (let pageIndex = 0; pageIndex < paginatedLoop; pageIndex++) {
            const failedCoiinTransfers = await prisma.transfer.findMany({
                where: {
                    status: { in: ["FAILED", "PENDING"] },
                    currency: COIIN,
                    action: { in: ["SHARING_REWARD", "PARTICIPATION_REWARD", "LOGIN_REWARD"] },
                },
                take,
                skip,
            });
            const batchTransfer: BatchTransferPayload = {
                senderAccountId: raiinmakerCoiinCurrency.tatumId,
                transaction: [],
            };
            const prismaTransactions = [];
            for (const transfer of failedCoiinTransfers) {
                const userCurrency = await TatumClient.findOrCreateCurrency({
                    walletId: transfer.walletId || "",
                    symbol: COIIN,
                    network: BSC,
                });
                batchTransfer.transaction.push({
                    recipientAccountId: userCurrency.tatumId,
                    amount: transfer.amount.toString(),
                });
                console.log(
                    "TRANSFER FIX PREPARED: ",
                    transfer.id,
                    transfer.amount.toString(),
                    transfer.walletId,
                    transfer.action
                );
                prismaTransactions.push(
                    prisma.transfer.update({
                        where: { id: transfer.id },
                        data: { status: TransferStatus.SUCCEEDED },
                    })
                );
            }
            await TatumClient.transferFundsBatch(batchTransfer);
            await prisma.$transaction(prismaTransactions);
            skip += take;
        }
    }
};

const fixFailedCampaignTransfers = async () => {
    const failedCampaignTransfersCount = await prisma.transfer.count({
        where: {
            status: "FAILED",
            action: "CAMPAIGN_REWARD",
        },
    });
    console.log("FAILED CAMPAIGN TRANSFERS: ", failedCampaignTransfersCount);
    if (failedCampaignTransfersCount) {
        const take = 200;
        let skip = 0;
        const paginatedLoop = Math.ceil(failedCampaignTransfersCount / take);
        for (let pageIndex = 0; pageIndex < paginatedLoop; pageIndex++) {
            const failedCampaignTransfers = await prisma.transfer.findMany({
                where: {
                    status: "FAILED",
                    action: "CAMPAIGN_REWARD",
                },
                take,
                skip,
            });
            const prismaTransactions = [];
            for (const transfer of failedCampaignTransfers) {
                const campaign = await prisma.campaign.findFirst({ where: { id: transfer.campaignId || "" } });
                if (!campaign) throw new Error("Campaign not found.");
                const campaignCurrency = await prisma.currency.findFirst({ where: { id: campaign.currencyId || "" } });
                if (!campaignCurrency) throw new Error("Currency not found for campaign.");
                const campaignToken = await prisma.token.findFirst({ where: { id: campaignCurrency.tokenId || "" } });
                if (!campaignToken) throw new Error("Token not found for campaign.");

                const userCurrency = await TatumClient.findOrCreateCurrency({
                    walletId: transfer.walletId || "",
                    symbol: campaignToken.symbol,
                    network: campaignToken.network,
                });

                try {
                    await TatumClient.transferFunds({
                        senderAccountId: campaignCurrency.tatumId,
                        recipientAccountId: userCurrency.tatumId,
                        amount: transfer.amount.toString(),
                        recipientNote: "COMPENSATING_FAILED_TRANSFER",
                    });
                    console.log(
                        "TRANSFER FIX PREPARED: ",
                        transfer.id,
                        transfer.amount.toString(),
                        transfer.walletId,
                        transfer.action
                    );
                    prismaTransactions.push(
                        prisma.transfer.update({
                            where: { id: transfer.id },
                            data: { status: TransferStatus.SUCCEEDED },
                        })
                    );
                } catch (error) {}
            }
            await prisma.$transaction(prismaTransactions);
            skip += take;
        }
    }
};

const updateTatumBalances = async () => {
    const supportedTokens = await prisma.token.findMany({ where: { enabled: true } });
    for (const token of supportedTokens) {
        const tatumSymbol = getCurrencyForTatum(token);
        const totalAccountForSymbol = (await TatumClient.getTotalAccounts(tatumSymbol)).total;
        console.log(`TOTAL ACCOUNTS FOR: ${tatumSymbol} ${totalAccountForSymbol}`);
        const pageSize = 50;
        let page = 0;
        const paginatedLoop = Math.ceil(totalAccountForSymbol / pageSize);
        for (let pageIndex = 0; pageIndex < paginatedLoop; pageIndex++) {
            const prismaTransactions = [];
            const accountList = await TatumClient.getAccountList(tatumSymbol, page, pageSize);
            console.log("FETCHED ACCOUNT LIST FOR PAGE: ", page);
            for (const account of accountList) {
                const foundAccount = await prisma.currency.findFirst({ where: { tatumId: account.id } });
                if (foundAccount) {
                    prismaTransactions.push(
                        prisma.$executeRaw`UPDATE currency set "accountBalance" = ${parseFloat(
                            account.balance.accountBalance
                        )}, "availableBalance" = ${parseFloat(
                            account.balance.availableBalance
                        )}, "updatedAt" = ${new Date()} WHERE "tatumId" = ${account.id}`
                    );
                }
            }
            console.log("PENDING PRISMA TRANSACTIONS: ", prismaTransactions.length);
            await prisma.$transaction(prismaTransactions);
            page += 1;
        }
    }
};

(async () => {
    console.log("Starting auto coiin transfer.");
    await Secrets.initialize();
    await Firebase.initialize();
    const connection = await app.connectDatabase();
    console.log("Secrets and connection initialized.");
    try {
        const emailAddressList = ["ray@raiinmaker.com", "murad@raiinmaker.com", "ben@raiinmaker.com"];
        const raiinmakerOrg = await prisma.org.findFirst({ where: { name: RAIINMAKER_ORG_NAME } });
        if (!raiinmakerOrg) throw new Error("Org not found for raiinmaker.");
        const raiinmakerWallet = await prisma.wallet.findFirst({ where: { orgId: raiinmakerOrg.id } });
        if (!raiinmakerWallet) throw new Error("Wallet not found fro raiinmaker.");
        const coiinToken = await prisma.token.findFirst({ where: { symbol: COIIN, network: BSC } });
        if (!coiinToken) throw new Error("Coiin token not found.");
        const raiinmakerCoiinCurrency = await prisma.currency.findFirst({
            where: { walletId: raiinmakerWallet.id, tokenId: coiinToken.id },
        });
        if (!raiinmakerCoiinCurrency) throw new Error("Coiin currency not found for raiinmaker.");
        const balanceData = await TatumClient.getAccountBalance(raiinmakerCoiinCurrency.tatumId);
        const availableBalance = parseFloat(balanceData.availableBalance);
        if (process.env.NODE_ENV === "production" && availableBalance < COIIN_ALERT_TRIGGER_LIMIT) {
            for (const email of emailAddressList) {
                await SesClient.coiinBalanceAlert(email, availableBalance);
            }
        }
        await fixFailedCoiinTransfers(raiinmakerCoiinCurrency);
        await fixFailedCampaignTransfers();
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
