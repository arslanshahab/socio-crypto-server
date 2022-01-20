import { BigNumber } from "bignumber.js";
import { BN } from "../../util";

export class StandardDeviation {
    average: BigNumber;
    distributionSum: BigNumber;
    data: BigNumber[] = [];

    constructor(data: BigNumber[]) {
        this.data = data;
    }

    mean() {
        const sum = this.data.reduce((acc, curr) => acc.plus(curr), new BN(0));
        this.average = sum.div(this.data.length);
    }

    distribution() {
        this.distributionSum = this.data
            .map((value) => {
                return value.minus(this.average).absoluteValue().exponentiatedBy(2);
            })
            .reduce((acc, curr) => acc.plus(curr), new BN(0));
    }

    calculate() {
        this.mean();
        this.distribution();
        return {
            standardDeviation: this.distributionSum.div(this.data.length).sqrt(),
            average: this.average,
        };
    }
}
