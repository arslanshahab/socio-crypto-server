import BigNumber from 'bignumber.js';
import {ValueTransformer} from "typeorm";

export const BigNumberEntityTransformer: ValueTransformer = {
    from: (value: any) => new BigNumber(value),
    to: (value: any) => value.toString()
};

export const StringifiedArrayTransformer: ValueTransformer = {
  from: (value: any) => JSON.parse(value),
  to: (value: any) => JSON.stringify(value),
}
