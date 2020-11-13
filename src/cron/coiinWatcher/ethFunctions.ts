import fetch from 'node-fetch';
import Web3 from 'web3';
import logger from '../../util/logger';
import {Transaction} from './transactionModel';

const { NODE_ENV = 'development' } = process.env;

const coldWallet = NODE_ENV === 'production' ? '0x9f6fE7cF8CCC66477c9f7049F22FbbE35234274D' : '0x275EE6238D103fDBE49d4cF6358575aA914F8654';
const tokenContract = NODE_ENV === 'production' ? '0x87ff4a65200337b88ae5c43650e2b7d5a8f17d10' : '0x0bBd0B3Bca94B037b73FF3E02db3154AA558113f';
const ethConnectionUrl = NODE_ENV === 'production' ? 'https://mainnet.infura.io/v3/c817284c8c504027a5701f2a6bc94c7f' : 'https://ropsten.infura.io/v3/c817284c8c504027a5701f2a6bc94c7f';
const web3 = new Web3(new Web3.providers.HttpProvider(ethConnectionUrl));

const getFilterPostParams = (lastCheckedBlock: number, currentBlock: number) => {
  const lastCheckedBlockHex = `0x${Number(lastCheckedBlock).toString(16)}`;
  const currentBlockHex = `0x${Number(currentBlock).toString(16)}`;
  return {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      jsonrpc: '2.0',
      method: 'eth_getLogs',
      params: [{
        fromBlock: lastCheckedBlockHex,
        toBlock: currentBlockHex,
        address: tokenContract,
        topics: [
          '0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef',
          null,
          `0x000000000000000000000000${coldWallet.replace('0x','')}`
        ]
      }],
      id: 74
    })
  };
};

export const checkForTokenTransactionsOnContract = async (lastBlockChecked: number,  currentBlock: number) => {
  logger.info(`LAST CHECKED BLOCK: ${lastBlockChecked}, CURRENT BLOCK: ${currentBlock}`);
  const filteredContractTransactions = await (await fetch(ethConnectionUrl, getFilterPostParams(lastBlockChecked, currentBlock))).json();
  logger.info(JSON.stringify(filteredContractTransactions));
  if (filteredContractTransactions.error) throw new Error((filteredContractTransactions.error.message || 'error occurred getting response from ETH node'));
  logger.info(`ETH RESPONSE: ${JSON.stringify(filteredContractTransactions)}`);
  if (filteredContractTransactions.result.length === 0) logger.info(`NO TRANSACTIONS FOUND IN ${currentBlock - lastBlockChecked} BLOCKS`);
  return (filteredContractTransactions.result.length > 0) ? filteredContractTransactions.result.map((txn: any) => new Transaction(txn)).filter((x: any) => !!x) : [];
}

export const getLatestBlock = async () => {
  const latestBlock = await web3.eth.getBlock('latest');
  return Number(latestBlock.number) - 1;
}
