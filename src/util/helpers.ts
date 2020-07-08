import { Request, Response, NextFunction } from 'express';
import { BigNumber } from 'bignumber.js';

export const getBase64FileExtension = (image: string) => {
  if (image === '') throw new Error('invalid image uploaded');
  return image.split(':')[1].split(';')[0];
}

export const asyncHandler = (fn: any) => (req: Request, res: Response, next: NextFunction) => {
  return Promise.resolve(fn(req, res, next)).catch(next);
};

export const extractFactor = (factor: string): string => {
  try {
    const result = JSON.parse(factor);
    const keys = Object.keys(result);
    if (keys.length > 1 || keys.length === 0) throw new Error('factor must be an object with a single key');
    return result[keys[0]];
  } catch (_) {
    // if it is failing to parse, factor is most likely just the string value
    return factor;
  }
};

export const generateRandomNumber = () => Math.floor(Math.random() * 9000000);

export const BN = BigNumber.clone({
  EXPONENTIAL_AT: [-1e9, 1e9]
})

// Prevent use in primitive operations.
// See https://mikemcl.github.io/bignumber.js/#type-coercion
BN.prototype.valueOf = function() {
  throw Error('Conversion to primitive type is prohibited')
}

