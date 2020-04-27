import {ValueTransformer} from "typeorm";

export const BigIntEntityTransformer: ValueTransformer = {
    from: (value: any) => BigInt(value),
    to: (value: any) => value.toString()
};

export const StringifiedArrayTransformer: ValueTransformer = {
  from: (value: any) => JSON.parse(value),
  to: (value: any) => JSON.stringify(value),
}
