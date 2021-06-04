import Web3 from 'web3';
import {BN, USD_PER_COIIN} from "../util/helpers";
import abi from '../abi.json'
import {getEthPriceInUSD, getTokenPriceInUsd} from "../clients/ethereum";
  import {AbiItem} from "web3-utils";
import {Secrets} from "../util/secrets";
import BigNumber from 'bignumber.js';
import { CryptoCurrency } from '../models/CryptoCurrency';

const { NODE_ENV } = process.env;

const HOT_WALLET = NODE_ENV === 'production' ? '0x955250Fd0F7f4F6eE3570535f9B7AD3B8141F148' : '0xE21095c0be9c57f2ebb4FeE72c418B5CF447e8ae';
let provider;
if (NODE_ENV === 'production') {
  provider = new Web3.providers.HttpProvider('https://mainnet.infura.io/v3/c817284c8c504027a5701f2a6bc94c7f');
} else {
  provider = new Web3.providers.HttpProvider('https://ropsten.infura.io/v3/c817284c8c504027a5701f2a6bc94c7f');
}
const web3 = new Web3(provider);
// In Production, use Coiin. Otherwise, use the TT (test token) on Ropsten.
const coiinAddress = NODE_ENV === 'production' ? '0x87ff4a65200337b88ae5c43650e2b7d5a8f17d10' : '0x0bbd0b3bca94b037b73ff3e02db3154aa558113f';
const gasLimitString = '200000';

export const getWeiPerToken = async (token: string = 'coiin') => {
  let usdPerToken;
  const usdPerEth = new BN(await getEthPriceInUSD());
  if (token === 'coiin') usdPerToken = USD_PER_COIIN;
  else usdPerToken = await getTokenPriceInUsd(token.toLowerCase());
  const ethPerToken = new BN(usdPerToken).div(usdPerEth).toPrecision(6)
  return web3.utils.toWei(ethPerToken.toString());
}

export const getEstimatedGasPrice = async (parent: any, args: { symbol: string }, context: any) => {
  const { symbol } = args;
  const gasPrice = new BN(await getGasPriceAsToken(undefined, symbol));
  return gasPrice.div((10**18)).toString();
}

export const getGasPriceAsToken = async (gasPrice?: string, token: string = 'coiin') => {
  if (!gasPrice) gasPrice = await web3.eth.getGasPrice();
  const gasPriceBig = BigInt(gasPrice);
  const gasLimit = BigInt(gasLimitString);
  const weiPerCoiin = BigInt(await getWeiPerToken(token));
  const adjustedGasPrice = (gasPriceBig * gasLimit * BigInt(10**18)) / weiPerCoiin;
  return adjustedGasPrice.toString()
}

export const performCoiinTransfer = async (to: string, value: BigNumber, currency: string = 'coiin') => {
  // Ensure hot wallet has funds for this withdrawal
  if (to.startsWith('0x')) to = to.slice(2, to.length);
  let tokenContractAddress = coiinAddress;
  if (currency !== 'coiin' && currency !== 'eth') tokenContractAddress = (await CryptoCurrency.findOneOrFail({ where: { type: currency } })).contractAddress;
  const contract = new web3.eth.Contract(abi as AbiItem[], tokenContractAddress);
  const balance = await contract.methods.balanceOf(HOT_WALLET).call();
  const gasPrice = await web3.eth.getGasPrice();
  const bigBalance = new BN(balance / (10**18));
  if (bigBalance.isLessThan(value)){
    throw new Error(`A problem occured sending ${currency} to your ethereum wallet. Please try again in a few minutes. If this problem persists, please contact support.`);
  }
  const gasPriceAsCoiin = await getGasPriceAsToken(gasPrice, currency);
  const valueInWei = new BN(web3.utils.toWei(value.toString()));
  if (valueInWei.minus(gasPriceAsCoiin).isLessThan(0)) {
      // TODO: instead of failing, reject transfer and send notification that gas was too high
      throw new Error('Gas price is greater than transfer value.')
    }
  const hexValue = (valueInWei.minus(gasPriceAsCoiin).toString(16));
  const chainId = NODE_ENV === 'production' ? 1 : 3; // ChainId 1 is MainNet, 3 is Ropsten
  const data = '0xa9059cbb' + to.padStart(64, '0') + hexValue.padStart(64, '0'); // Invoke a transfer on the DRGN ECR20 contract
  const signedTxn = await web3.eth.accounts.signTransaction(
    {
      chainId,
      to: tokenContractAddress,
      data,
      gasPrice: Math.max(Number(gasPrice), 2000000000), // default to 2Gwei
      gas: gasLimitString
    },
    Secrets.ethHotWalletPrivKey
    );
    if (signedTxn.rawTransaction) {
      const transaction = await web3.eth.sendSignedTransaction(signedTxn.rawTransaction);
      return transaction['transactionHash'];
    } else {
      throw new Error(`${signedTxn}`)
    }
};
