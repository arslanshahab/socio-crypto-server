import {ValueTransformer} from "typeorm";
import {BN} from './helpers';

export const BigNumberEntityTransformer: ValueTransformer = {
    from: (value: any) => {
      if (!value) return;
      return new BN(value);
    },
    to: (value: any) => {
      if (!value) return;
      return value.toString();
    }
};

export const StringifiedArrayTransformer: ValueTransformer = {
  from: (value: any) => JSON.parse(value),
  to: (value: any) => JSON.stringify(value),
}

const transformAlgorithm = (algorithm: any) => {
    if (!algorithm) return;
    try {
        algorithm['initialTotal'] = new BN(algorithm['initialTotal']);
        for(const key in algorithm['pointValues']) {
            algorithm['pointValues'][key] = new BN(algorithm['pointValues'][key]);
        }
        for(const tier in algorithm.tiers) {
            if (!algorithm['tiers'][tier]['threshold'] && !algorithm['tiers'][tier]['totalCoiins']) {
                algorithm['tiers'][tier]['threshold'] = '';
                algorithm['tiers'][tier]['totalCoiins'] = '';
                continue;
            }
            algorithm['tiers'][tier]['threshold'] = new BN(algorithm['tiers'][tier]['threshold']);
            algorithm['tiers'][tier]['totalCoiins'] = new BN(algorithm['tiers'][tier]['totalCoiins']);
        }
        return algorithm;
    } catch (e) {
        throw Error(`[TRANSFORMER] algorithm key not found ${e}`);
    }
}

export const AlgorithmTransformer: ValueTransformer = {
    from: transformAlgorithm,
    to: value => value
}
