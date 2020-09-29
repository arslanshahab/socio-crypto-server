import Web3 from 'web3';
import {BN} from "../util/helpers";
import abi from '../abi.json'
import {getEthPriceInUSD} from "../clients/ethereum";
import {AbiItem} from "web3-utils";
import {Secrets} from "../util/secrets";
import BigNumber from 'bignumber.js';

const { NODE_ENV } = process.env;

/**
 * TODO:
 * revert to staging parity node URL when done testing/demo:
 * http://internal-Parity-Ropsten-Internal-1699752391.us-west-2.elb.amazonaws.com:8545
 * http://internal-Parity-Mainnet-Internal-1844666982.us-west-2.elb.amazonaws.com:8545
 * https://mainnet.infura.io/v3/05a7c63aafc34860a34f6f2c15b4b1af
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
const contract = new web3.eth.Contract(abi as AbiItem[], dragonAddress);
const gasLimitString = '200000';

export const getWeiPerCoiin = async () => {
  const usdPerEth = new BN(await getEthPriceInUSD());
  // pinning value of coiin at 10 cents
  const ethPerCoiin = new BN(0.1).div(usdPerEth).toPrecision(6)
  return web3.utils.toWei(ethPerCoiin.toString());
}

export const getEstimatedGasPrice = async (args: any, context: any) => {
  const gasPrice = new BN(await getGasPriceAsCoiin())
  return gasPrice.div((10**18));
}

export const getGasPriceAsCoiin = async (gasPrice?: string) => {
  if (!gasPrice) gasPrice = await web3.eth.getGasPrice();
  const gasPriceBig = BigInt(gasPrice);
  const gasLimit = BigInt(gasLimitString);
  const weiPerCoiin = BigInt(await getWeiPerCoiin());
  const adjustedGasPrice = (gasPriceBig * gasLimit * BigInt(10**18)) / weiPerCoiin;
  return adjustedGasPrice.toString()
}

export const performCoiinTransfer = async (to: string, value: BigNumber) => {
  // Ensure hot wallet has funds for this withdrawal
  if (to.startsWith('0x')) to = to.slice(2, to.length);
  const balance = await contract.methods.balanceOf(HOT_WALLET).call();
  const gasPrice = await web3.eth.getGasPrice();
  const bigBalance = new BN(balance / (10**18));
  if (bigBalance.isLessThan(value))
    throw new Error('A problem occured sending Coiin to your ethereum wallet. Please try again in a few minutes. If this problem persists, please contact support.');
  const gasPriceAsCoiin = await getGasPriceAsCoiin(gasPrice);
  const valueInWei = new BN(web3.utils.toWei(value.toString()));
  const hexValue = (valueInWei.minus(gasPriceAsCoiin).toString(16));
  const chainId = NODE_ENV === 'production' ? 1 : 3; // ChainId 1 is MainNet, 3 is Ropsten
  const data = '0xa9059cbb' + to.padStart(64, '0') + hexValue.padStart(64, '0'); // Invoke a transfer on the DRGN ECR20 contract
  const signedTxn = await web3.eth.accounts.signTransaction(
    {
      chainId,
      to: dragonAddress,
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
