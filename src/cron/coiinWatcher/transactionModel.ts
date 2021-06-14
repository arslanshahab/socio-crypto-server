import { BN } from "../../util/helpers";

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
}
