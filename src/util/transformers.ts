import {ValueTransformer} from "typeorm";

export const BigIntEntityTransformer: ValueTransformer = {
    from: (value: any) => BigInt(value),
    to: (value: any) => value.toString()
};
