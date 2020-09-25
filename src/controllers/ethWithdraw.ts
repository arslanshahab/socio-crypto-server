import Web3 from 'web3';
import {BN} from "../util/helpers";
import { BigNumber } from 'bignumber.js';
import abi from '../abi.json'
import {getEthPriceInUSD} from "../clients/coinGecko";
import {Secrets} from "../util/secrets";

const { NODE_ENV } = process.env;

/**
 * TODO:
 * revert to staging parity node URL when done testing/demo:
 * http://internal-Parity-Ropsten-Internal-1699752391.us-west-2.elb.amazonaws.com:8545
  */

const HOT_WALLET = NODE_ENV === 'production' ? '' : '0xE21095c0be9c57f2ebb4FeE72c418B5CF447e8ae';
let provider;
if (NODE_ENV === 'production') {
  provider = new Web3.providers.HttpProvider('http://internal-Parity-Mainnet-Internal-1844666982.us-west-2.elb.amazonaws.com:8545');
} else {
  provider = new Web3.providers.HttpProvider('https://ropsten.infura.io/v3/b701655826f045a5be49c4346d01e57b');
}
const web3 = new Web3(provider);
// In Production, use DRGN. Otherwise, use the TT (test token) on Ropsten.
const dragonAddress = NODE_ENV === 'production' ? '' : '0x0bbd0b3bca94b037b73ff3e02db3154aa558113f';
const contract = new web3.eth.Contract(abi, dragonAddress);
const gasLimitString = '200000';

export const getWeiPerCoiin = async () => {
  const usdPerEth = new BN(await getEthPriceInUSD());
  // pinning value of coiin at 15 cents
  const ethPerCoiin = usdPerEth.div(0.15).toPrecision(18);
  return web3.utils.toWei(ethPerCoiin);
}

export const getGasPrice = async () => {
  const gasPrice = BigInt(await web3.eth.getGasPrice());
  const gasLimit = BigInt(gasLimitString);
  const weiPerCoiin = await getWeiPerCoiin();
  const adjustedGasPrice = (gasPrice * gasLimit * BigInt(10 ** 18)) / BigInt(weiPerCoiin);
  return adjustedGasPrice.toString()
}

export const performEthTransfer = async (args: {to: string, value: string}, context: any) => {
  const {to, value} = args;
  return await performCoiinTransfer(to, new BN(value));
}

export const performCoiinTransfer = async (to: string, value: BigNumber) => {
  // Ensure hot wallet has funds for this withdrawal
  try {
    if (to.startsWith('0x')) to = to.slice(2, to.length);
    const balance = await contract.methods.balanceOf(HOT_WALLET).call();
    const bigBalance = new BN(balance / (10**18));
    if (bigBalance.isLessThan(value))
      throw new Error('A problem occured sending Coiin to your ethereum wallet. Please try again in a few minutes. If this problem persists, please contact support.');
    const gasPrice = await getGasPrice();
    const valueInWei = new BN(web3.utils.toWei(value.toPrecision(18)));
    const hexValue = (valueInWei.minus(gasPrice).toString(16));
    const chainId = NODE_ENV === 'production' ? 1 : 3; // ChainId 1 is MainNet, 3 is Ropsten
    const data = '0xa9059cbb' + to.padStart(64, '0') + hexValue.padStart(64, '0'); // Invoke a transfer on the DRGN ECR20 contract
    const signedTxn = await web3.eth.accounts.signTransaction(
      {
        chainId,
        to: dragonAddress,
        data,
        gasPrice: Math.max(Number(gasPrice.toString()), 2000000000), // default to 2Gwei
        gas: gasLimitString
      },
      Secrets.ethHotWalletPrivKey
    );
    if (signedTxn.rawTransaction) {
      const transaction = await web3.eth.sendSignedTransaction(signedTxn.rawTransaction);
      return transaction['transactionHash'];
    }
  } catch (e) {
    throw new Error(`ethereum transaction failed ${e}`);
  }
  return;
};
