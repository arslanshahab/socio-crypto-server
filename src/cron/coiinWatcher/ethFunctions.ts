import fetch from 'node-fetch';
import Web3 from 'web3';
import logger from '../../util/logger';
import {CryptoTransaction} from "../../models/CryptoTransaction";
import {BN} from "../../util/helpers";

const { NODE_ENV = 'development' } = process.env;

const coldWallet = NODE_ENV === 'production' ? '0x9f6fE7cF8CCC66477c9f7049F22FbbE35234274D' : '0x275EE6238D103fDBE49d4cF6358575aA914F8654';
const ethConnectionUrl = NODE_ENV === 'production' ? 'https://mainnet.infura.io/v3/c817284c8c504027a5701f2a6bc94c7f' : 'https://ropsten.infura.io/v3/c817284c8c504027a5701f2a6bc94c7f';
const web3 = new Web3(new Web3.providers.HttpProvider(ethConnectionUrl));

export const getFilterPostParams = (lastCheckedBlock: number, currentBlock: number, tokenContract: string) => {
  const lastCheckedBlockHex = `0x${Number(lastCheckedBlock).toString(16)}`;
  const currentBlockHex = `0x${Number(currentBlock).toString(16)}`;
  const params: {[index: string]: string | Array<string | null>} = {
    fromBlock: lastCheckedBlockHex,
    toBlock: currentBlockHex,
    address: tokenContract,
    topics: [
      '0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef',
      null,
      `0x000000000000000000000000${coldWallet.replace('0x','')}`
    ]
  }
  return {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      jsonrpc: '2.0',
      method: 'eth_getLogs',
      params: [params],
      id: 74
    })
  };
};

export const checkForEthTransactionsOnWallet = async (startBlockNumber: number, endBlockNumber: number) => {
  console.log("Searching for transactions to/from account \"" + coldWallet + "\" within blocks "  + startBlockNumber + " and " + endBlockNumber);
  const ethTransactions: CryptoTransaction[] = [];
  for (let i = startBlockNumber; i <= endBlockNumber; i++) {
    if (i % 500 == 0) {
      console.log("Searching block " + i);
    }
    const block = await web3.eth.getBlock(i, true);
    if (block != null && block.transactions != null) {
      block.transactions.forEach((txn) => {
        if (coldWallet === txn.to) {
          const newTransaction = new CryptoTransaction();
          newTransaction.blockNumber = txn.blockNumber || 0;
          newTransaction.from = txn.from;
          newTransaction.to = txn.to || '';
          newTransaction.hash = txn.hash || '';
          newTransaction.convertedValue = txn.value;
          newTransaction.type = 'ETH';
          ethTransactions.push(newTransaction);
        }
      })
    }
  }
  logger.info(`[ETH TRANSACTIONS FOUND]: ${ethTransactions ? JSON.stringify(ethTransactions) : []}`);
  return ethTransactions;
}

export const checkForTokenTransactionsOnContract = async (lastBlockChecked: number,  currentBlock: number, contractAddress: string) => {
  logger.info(`LAST CHECKED BLOCK: ${lastBlockChecked}, CURRENT BLOCK: ${currentBlock} CONTRACT: ${contractAddress}`);
  const filteredContractTransactions = await (await fetch(ethConnectionUrl, getFilterPostParams(lastBlockChecked, currentBlock, contractAddress))).json();
  logger.info(JSON.stringify(filteredContractTransactions));
  if (filteredContractTransactions.error) throw new Error((filteredContractTransactions.error.message || 'error occurred getting response from ETH node'));
  logger.info(`ETH RESPONSE: ${JSON.stringify(filteredContractTransactions)}`);
  if (filteredContractTransactions.result.length === 0) logger.info(`NO TRANSACTIONS FOUND IN ${currentBlock - lastBlockChecked} BLOCKS`);
  return (filteredContractTransactions.result.length > 0) ? filteredContractTransactions.result.map((txn: any) => {
    const newTransaction = new CryptoTransaction();
    newTransaction.blockNumber = parseInt(txn.blockNumber, 16);
    newTransaction.from = txn.from || `0x${txn.topics[1].substr(txn.topics[1].length - 40)}`;
    newTransaction.to = txn.address;
    newTransaction.hash = txn.transactionHash;
    newTransaction.type = txn.type;
    newTransaction.convertedValue = txn.convertedValue || new BN(txn.data, 16).toString(10);
    return newTransaction
  }) : [];
}

export const getLatestBlock = async () => {
  const latestBlock = await web3.eth.getBlock('latest');
  return Number(latestBlock.number) - 1;
}
