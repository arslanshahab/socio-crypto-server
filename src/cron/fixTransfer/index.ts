import { Secrets } from "../../util/secrets";
import { Application } from "../../app";
import * as dotenv from "dotenv";
import { Firebase } from "../../clients/firebase";
import { COIIN, BSC, RAIINMAKER_ORG_NAME, COIIN_ALERT_TRIGGER_LIMIT, TransferStatus } from "../../util/constants";
import { SesClient } from "../../clients/ses";
import { BatchTransferPayload, TatumClient } from "../../clients/tatumClient";
import { prisma, readPrisma } from "../../clients/prisma";
import { Currency } from "@prisma/client";
import { getCurrencyForTatum } from "../../util/tatumHelper";

dotenv.config();
const app = new Application();
console.log("APP instance created.");

export const fixFailedCoiinTransfers = async (raiinmakerCoiinCurrency: Currency) => {
    const failedCoiinTransfersCount = await readPrisma.transfer.count({
        where: {
            status: { in: ["FAILED", "PENDING"] },
            currency: COIIN,
            action: { in: ["SHARING_REWARD", "PARTICIPATION_REWARD", "LOGIN_REWARD"] },
        },
    });
    console.log("FAILED/PENDING COIIN TRANSFERS: ", failedCoiinTransfersCount);
    if (failedCoiinTransfersCount) {
        const take = 50;
        let skip = 0;
        const paginatedLoop = Math.ceil(failedCoiinTransfersCount / take);
        for (let pageIndex = 0; pageIndex < paginatedLoop; pageIndex++) {
            const failedCoiinTransfers = await readPrisma.transfer.findMany({
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
            for (let transferIndex = 0; transferIndex < failedCoiinTransfers.length; transferIndex++) {
                const transfer = failedCoiinTransfers[transferIndex];
                if (transfer) {
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
                    await prisma.transfer.update({
                        where: { id: transfer.id },
                        data: { status: TransferStatus.SUCCEEDED },
                    });
                }
            }
            console.log("BATCH: ", batchTransfer);
            await TatumClient.transferFundsBatch(batchTransfer);
            skip += take;
        }
    }
};

export const fixFailedCampaignTransfers = async () => {
    const failedCampaignTransfersCount = await readPrisma.transfer.count({
        where: {
            status: "FAILED",
            action: "CAMPAIGN_REWARD",
        },
    });
    console.log("FAILED CAMPAIGN TRANSFERS: ", failedCampaignTransfersCount);
    if (failedCampaignTransfersCount) {
        const take = 50;
        let skip = 0;
        const paginatedLoop = Math.ceil(failedCampaignTransfersCount / take);
        for (let pageIndex = 0; pageIndex < paginatedLoop; pageIndex++) {
            const failedCampaignTransfers = await readPrisma.transfer.findMany({
                where: {
                    status: "FAILED",
                    action: "CAMPAIGN_REWARD",
                },
                take,
                skip,
            });
            const prismaTransactions = [];
            for (let transferIndex = 0; transferIndex < failedCampaignTransfers.length; transferIndex++) {
                const transfer = failedCampaignTransfers[transferIndex];
                if (transfer) {
                    const campaign = await readPrisma.campaign.findFirst({ where: { id: transfer.campaignId || "" } });
                    if (!campaign) throw new Error("Campaign not found.");
                    const campaignCurrency = await readPrisma.currency.findFirst({
                        where: { id: campaign.currencyId || "" },
                    });
                    if (!campaignCurrency) throw new Error("Currency not found for campaign.");
                    const campaignToken = await readPrisma.token.findFirst({
                        where: { id: campaignCurrency.tokenId || "" },
                    });
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
            }
            await prisma.$transaction(prismaTransactions);
            skip += take;
        }
    }
};

const updateTatumBalances = async () => {
    const supportedTokens = await readPrisma.token.findMany({ where: { enabled: true } });
    for (let tokenIndex = 0; tokenIndex < supportedTokens.length; tokenIndex++) {
        const token = supportedTokens[tokenIndex];
        const tatumSymbol = getCurrencyForTatum(token);
        const totalAccountForSymbol = (await TatumClient.getTotalAccounts(tatumSymbol)).total;
        console.log(`TOTAL ACCOUNTS FOR: ${tatumSymbol} ${totalAccountForSymbol}`);
        const pageSize = 50;
        let page = 0;
        const paginatedLoop = Math.ceil(totalAccountForSymbol / pageSize);
        for (let pageIndex = 0; pageIndex < paginatedLoop; pageIndex++) {
            const accountList: any[] = await TatumClient.getAccountList(tatumSymbol, page, pageSize);
            const prismaTransactions = [];
            console.log("FETCHED ACCOUNT LIST FOR PAGE: ", page, tatumSymbol);
            for (let index = 0; index < accountList.length; index++) {
                const account = accountList[index];
                const foundAccount = await readPrisma.currency.findFirst({
                    where: { tatumId: account.id, symbol: account.currency },
                });
                if (foundAccount) {
                    console.log(
                        `${tatumSymbol} CURRENT: ${foundAccount.availableBalance} -- FETCHED: ${account.availableBalance}`
                    );
                    prismaTransactions.push(
                        prisma.currency.update({
                            where: { id: foundAccount.id },
                            data: {
                                accountBalance: parseFloat(account.balance.accountBalance),
                                availableBalance: parseFloat(account.balance.availableBalance),
                            },
                        })
                    );
                }
            }
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
        const raiinmakerOrg = await readPrisma.org.findFirst({ where: { name: RAIINMAKER_ORG_NAME } });
        if (!raiinmakerOrg) throw new Error("Org not found for raiinmaker.");
        const raiinmakerWallet = await readPrisma.wallet.findFirst({ where: { orgId: raiinmakerOrg.id } });
        if (!raiinmakerWallet) throw new Error("Wallet not found fro raiinmaker.");
        const coiinToken = await readPrisma.token.findFirst({ where: { symbol: COIIN, network: BSC } });
        if (!coiinToken) throw new Error("Coiin token not found.");
        const raiinmakerCoiinCurrency = await readPrisma.currency.findFirst({
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
