import { checkForEthTransactionsOnWallet, checkForTokenTransactionsOnContract, getLatestBlock } from "./ethFunctions";
import logger from "../../util/logger";
import { Secrets } from "../../util/secrets";
import { Application } from "../../app";
import { ExternalAddress } from "../../models/ExternalAddress";
import { Transfer } from "../../models/Transfer";
import { BN } from "../../util/helpers";
import { performCurrencyAction, updateOrgCampaignsStatusOnDeposit } from "../../controllers/helpers";
import { CryptoCurrency } from "../../models/CryptoCurrency";
import { CryptoTransaction } from "../../models/CryptoTransaction";
import dotenv from "dotenv";
import { S3Client } from "../../clients/s3";
if (process.env.LOAD_ENV) {
    dotenv.config();
}

const app = new Application();

(async () => {
    await Secrets.initialize();
    const connection = await app.connectDatabase();
    const tokens = await CryptoCurrency.find();
    let lastCheckedBlock, currentBlock;
    try {
        const storedLastCheckedBlock = process.env.LAST_BLOCK || (await S3Client.getLastCheckedBillingBlock());
        if (!storedLastCheckedBlock) return await S3Client.setLastCheckedBillingBlock(await getLatestBlock());
        else lastCheckedBlock = Number(storedLastCheckedBlock) + 1;
        const latestBlock = await getLatestBlock();
        currentBlock = Math.min(lastCheckedBlock + 1000, latestBlock);
        for (const token of tokens) {
            let transactions: CryptoTransaction[] = [];
            if (token.type === "ether") {
                logger.info("Checking for Ethereum transactions");
                transactions = await checkForEthTransactionsOnWallet(lastCheckedBlock, currentBlock);
            } else {
                logger.info(`Checking for contract transactions: ${token.contractAddress} ${token.type}`);
                transactions = (await checkForTokenTransactionsOnContract(
                    lastCheckedBlock,
                    currentBlock,
                    token.contractAddress
                )) as CryptoTransaction[];
            }
            const transactionEntities = await CryptoTransaction.save(transactions);
            if (transactions.length > 0) {
                const wallets: { [key: string]: ExternalAddress } = await ExternalAddress.getWalletsByAddresses(
                    transactions.map((txn) => txn.from.toLowerCase())
                );
                for (const transaction of transactionEntities) {
                    try {
                        if (!wallets[transaction.from.toLowerCase()]) {
                            if (token.missedTransfers) {
                                token.missedTransfers.push(transaction);
                            } else {
                                token.missedTransfers = [transaction];
                            }
                            continue;
                        }
                        const externalWallet = wallets[transaction.from.toLowerCase()];
                        console.log("EXTERNAL WALLET", externalWallet);
                        // perform transfer to users wallet
                        logger.info(`Wallet ID found: ${externalWallet.id}`);
                        // check that we don't have an existing
                        if (
                            !(await Transfer.findOne({
                                where: { transactionHash: transaction.hash, action: "deposit" },
                            }))
                        ) {
                            const transfer = Transfer.newFromDeposit(
                                externalWallet.wallet,
                                new BN(transaction.convertedValue),
                                transaction.from.toLowerCase(),
                                transaction.hash
                            );
                            await performCurrencyAction(
                                externalWallet.wallet.id,
                                token.type,
                                transaction.convertedValue,
                                "credit"
                            );
                            externalWallet.wallet.transfers.push(transfer);
                            await externalWallet.wallet.save();
                            await transfer.save();
                        }
                        await updateOrgCampaignsStatusOnDeposit(externalWallet.wallet);
                    } catch (e) {
                        console.error(
                            `Failed to transfer funds for wallet: ${transaction.from} with amount: ${transaction.convertedValue}`
                        );
                        console.error(e);
                        token.missedTransfers.push(transaction);
                    }
                }
            } else {
                logger.info("NO TRANSACTIONS FOUND FOR RUN");
            }
            await token.save();
        }
        logger.info(`setting latest block as ${currentBlock}`);
        if (!process.env.LAST_BLOCK) await S3Client.setLastCheckedBillingBlock(currentBlock);
    } catch (error) {
        logger.error(`An error occurred: ${error.message || JSON.stringify(error)}`);
    }
    await connection.close();
    process.exit(0);
})();
