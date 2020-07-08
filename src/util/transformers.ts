import {ValueTransformer} from "typeorm";
import { BN } from './helpers';

export const BigNumberEntityTransformer: ValueTransformer = {
    from: (value: any) => new BN(value),
    to: (value: any) => value.toString()
};

export const StringifiedArrayTransformer: ValueTransformer = {
  from: (value: any) => JSON.parse(value),
  to: (value: any) => JSON.stringify(value),
}
