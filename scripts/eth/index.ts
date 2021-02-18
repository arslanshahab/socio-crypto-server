import {
  checkForEthTransactionsOnWallet,
  checkForTokenTransactionsOnContract
} from "../../src/cron/coiinWatcher/ethFunctions";

(async () => {
  const contractAddress = '0x0bbd0b3bca94b037b73ff3e02db3154aa558113f';
  const latestBlock =  9404707;
  const lastCheckedBlock = latestBlock - 50;
  let ethTransactions = await checkForEthTransactionsOnWallet(lastCheckedBlock, latestBlock);
  const tokenTransactions = await checkForTokenTransactionsOnContract(lastCheckedBlock, latestBlock, contractAddress);
  ethTransactions = ethTransactions.concat(tokenTransactions);
  console.log(ethTransactions);
})();

