import { Secrets } from "../../util/secrets";
import { Application } from "../../app";
import dotenv from "dotenv";
import { TatumClient } from "../../clients/tatumClient";
import logger from "../../util/logger";
import { TatumAccount } from "../../models/TatumAccount";
import { TransactionType } from "@tatumio/tatum";
import { S3Client } from "../../clients/s3";
// import { Transfer } from "../../models/Transfer";

if (process.env.LOAD_ENV) {
    dotenv.config();
}

const app = new Application();

(async () => {
    await Secrets.initialize();
    const connection = await app.connectDatabase();
    // const currentUTCTime = new Date().getTime();
    let from;

    try {
        from = await S3Client.getLastCheckedTransactionTime();
        from = parseInt(from || "0");
    } catch (error) {
        // for first run, we wont pass this param and search complete history or transactions
        from = undefined;
    }

    try {
        const tatumAccounts = await TatumAccount.find();
        for (let index = 0; index < tatumAccounts.length; index++) {
            const account = tatumAccounts[index];
            const pageSize = 50;
            let offset = 0;
            let run = true;
            while (run) {
                const transactionList = await TatumClient.getAccountTransactions(
                    {
                        id: account.accountId,
                        transactionType: TransactionType.CREDIT_DEPOSIT,
                        ...(from && { from: from }),
                    },
                    pageSize,
                    offset
                );
                console.log(`Account:${account.accountId}---Currency:${account.currency}`, transactionList);
                if (transactionList.length === 0 || transactionList.length < pageSize) run = false;
                for (let transactionIndex = 0; transactionIndex < transactionList.length; transactionIndex++) {
                    // const transaction = transactionList[transactionIndex];
                    // const depositAddress = await DepositAddress.findOne({
                    //     where: { address: transaction.address },
                    //     relations: ["org", "org.wallet", "org.wallet.currency"],
                    // });
                    // if (!depositAddress) continue;
                    // await depositAddress.org.updateOrCreateBalance(
                    //     transaction.currency,
                    //     "add",
                    //     parseFloat(transaction.amount)
                    // );
                    // await Transfer.addTatumDeposit({
                    //     amount: transaction.amount,
                    //     txId: transaction.txId,
                    //     currency: transaction.currency,
                    //     org: depositAddress.org,
                    //     wallet: depositAddress.org.wallet,
                    // });
                    // const newDepositAddress = await TatumClient.generateDepositAddress(account.accountId);
                    // await depositAddress.org.updateOrCreateDepositAddress(newDepositAddress);
                }
                offset++;
            }
        }
        // await S3Client.setLastCheckedTransactionTime(currentUTCTime);
    } catch (error) {
        logger.error(`An error occurred: ${error.message || JSON.stringify(error)}`);
    }
    await connection.close();
    process.exit(0);
})();
