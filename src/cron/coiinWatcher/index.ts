import { checkForTokenTransactionsOnContract, getLatestBlock } from './ethFunctions';
import { S3Client } from '../../clients/s3';
import { Transaction } from './transactionModel';
import logger from '../../util/logger';
import { Secrets } from '../../util/secrets';
import { Application } from '../../app';
import { ExternalWallet } from '../../models/ExternalWallet';
import { Transfer } from '../../models/Transfer';
import { BN } from '../../util/helpers';

const app = new Application();

(async () => {
  await Secrets.initialize();
  const connection = await app.connectDatabase();
  let lastCheckedBlock, currentBlock;
  const currentRunFailures = [];
  try {
    
    const missedTransactions = (await S3Client.getMissedBillingTransfers()).map((txn: any) => {
      const { blockNumber, from, to: address, hash: blockHash, type, convertedValue } = txn;
      try {
        return new Transaction({ blockNumber, from, address, blockHash, type, convertedValue });
      } catch (e) {
        currentRunFailures.push(txn);
        return null;
      }
    }).filter((x: any) => !!x);
    const storedLastCheckedBlock = await S3Client.getLastCheckedBillingBlock();
    if (!storedLastCheckedBlock) return await S3Client.setLastCheckedBillingBlock(await getLatestBlock());
    else lastCheckedBlock = Number(storedLastCheckedBlock) + 1;
    const latestBlock = await getLatestBlock();
    currentBlock = Math.min(lastCheckedBlock + 1000, latestBlock);
    const tokenTransactions = await checkForTokenTransactionsOnContract(lastCheckedBlock, currentBlock);
    const transactions = missedTransactions.concat(tokenTransactions);
    if (transactions.length > 0) {
      const wallets: {[key: string]: ExternalWallet} = await ExternalWallet.getWalletsByAddresses(transactions.map((txn: Transaction) => txn.from.toLowerCase()));
      for (let i = 0; i < transactions.length; i++) {
        const transaction: Transaction = transactions[i];
        try {
          if (!wallets[transaction.from.toLowerCase()]) {
            currentRunFailures.push(transaction.asFailedTransfer());
            continue;
          }
          const externalWallet = wallets[transaction.from.toLowerCase()];
          // perform transfer to users wallet
          logger.info(`Wallet ID found: ${externalWallet.id}`);
          // check that we don't have an existing
          if (!await Transfer.findOne({ where: { transactionHash: transaction.getHash(), action: 'deposit' } })) {
            await (Transfer.newFromDeposit(externalWallet.user.wallet, new BN(transaction.getValue()), transaction.getFrom().toLowerCase(), transaction.getHash())).save();
            externalWallet.balance.plus(transaction.getValue());
            await externalWallet.save();
          }
        } catch (e) {
          console.error(`Failed to transfer funds for wallet: ${transaction.from} with amount: ${transaction.getValue()}`);
          console.error(e);
          currentRunFailures.push(transaction.asFailedTransfer());
          continue;
        }
      }
    } else {
      logger.info('NO TRANSACTIONS FOUND FOR RUN');
    }
    logger.info(`setting latest block as ${currentBlock}`);
    await S3Client.setLastCheckedBillingBlock(currentBlock);
  } catch (error) {
    logger.error(`An error occurred: ${error.message || JSON.stringify(error)}`);
  }
  logger.info(`uploading ${currentRunFailures.length} missed transfers`);
  await S3Client.uploadMissedTransfers(currentRunFailures);
  await connection.close();
  process.exit(0);
})();