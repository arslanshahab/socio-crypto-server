import { BN } from '../../util/helpers';

const getDecimal = (str: string) =>  {
  if (str.length <= 18) {
    return `0.${str.padStart(18, '0')}`;
  }
  const pos = str.length - 18;
  return [str.slice(0, pos), str.slice(pos)].join('.');
}

export class Transaction {
  public blockNumber: number;
  public from: string;
  public to: string;
  public hash: string;
  public type: string;
  public convertedValue: string;

  constructor(txn: any) {
    this.blockNumber = txn.blockNumber;
    this.from = txn.from || `0x${txn.topics[1].substr(txn.topics[1].length - 40)}`;
    this.to = txn.address;
    this.hash = txn.blockHash;
    this.type = txn.type;
    this.convertedValue = txn.convertedValue || new BN(txn.data, 16).toString(10);
  }

  public getHash() {
    return this.hash;
  }

  public getFrom() {
    return this.from;
  }

  public getValue() {
    return getDecimal(this.convertedValue);
  }

  public asFailedTransfer() {
    return {
      blockNumber: this.blockNumber,
      from: this.from,
      to: this.to,
      hash: this.hash,
      type: this.type,
      convertedValue: this.convertedValue
    };
  }
}