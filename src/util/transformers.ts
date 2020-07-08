import {ValueTransformer} from "typeorm";
import {BN} from './helpers';
import {AlgorithmSpecs} from "../types";

export const BigNumberEntityTransformer: ValueTransformer = {
    from: (value: any) => new BN(value),
    to: (value: any) => value.toString()
};

export const StringifiedArrayTransformer: ValueTransformer = {
  from: (value: any) => JSON.parse(value),
  to: (value: any) => JSON.stringify(value),
}

const transformAlgorithm = (algorithm: AlgorithmSpecs) => {
    console.log(algorithm);
    algorithm['initialTotal'] = new BN(algorithm['initialTotal']);
    for(const key in algorithm['pointValues']) {
        algorithm['pointValues'][key] = new BN(algorithm['pointValues'][key]);
    }
    for(const tier in algorithm.tiers) {
        algorithm['tiers'][tier]['threshold'] = new BN(algorithm['tiers'][tier]['threshold']);
        algorithm['tiers'][tier]['totalCoiins'] = new BN(algorithm['tiers'][tier]['totalCoiins']);
    }
    return algorithm;
}

export const AlgorithmTransformer: ValueTransformer = {
    from: transformAlgorithm,
    to: value => value
}
