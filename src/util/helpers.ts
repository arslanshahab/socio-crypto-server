import { Request, Response, NextFunction } from 'express';
import { BigNumber } from 'bignumber.js';
import { FactorGeneration, KycUser } from '../types';
import { Factor } from '../models/Factor';

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

export const createFactorsFromKycData = (kycData: KycUser, factorCreateRequests: FactorGeneration[] = []) => {
  const factors: {[key: string]: Factor} = {};
  for (let i = 0; i < factorCreateRequests.length; i++) {
    const factorRequest = factorCreateRequests[i];
    let factorData, factor, factorName;
    switch (factorRequest.name) {
      case 'fullName':
        factorData = `${kycData.firstName} ${kycData.lastName}`;
        factorName = 'MyFii-Verified-Name';
        break;
      case 'firstName':
        factorData = kycData.firstName;
        factorName = 'MyFii-Verified-FirstName';
        break;
      case 'lastName':
        factorData = kycData.lastName;
        factorName = 'MyFii-Verified-LastName';
        break;
      case 'address':
        factorData = kycData.address.address1;
        if (kycData.address.address2) factorData += ` ${kycData.address.address2}`;
        factorData += ` ${kycData.address.city} ${kycData.address.state} ${kycData.address.country} ${kycData.address.zip}`;
        factorName = 'MyFii-Verified-Address';
        break;
      case 'city':
        factorData = kycData.address.city;
        factorName = 'MyFii-Verified-City';
        break;
      case 'state':
        factorData = kycData.address.state;
        factorName = 'MyFii-Verified-State';
        break;
      case 'country':
        factorData = kycData.address.country;
        factorName = 'MyFii-Verified-Country';
        break;
      case 'phone':
        factorData = kycData.phoneNumber;
        factorName = 'MyFii-Verified-Phone';
        break;
    }
    if (factorData && factorName) {
      factor = new Factor({id: factorRequest.id, name: factorName, factor: factorData});
      factor.sign();
      factors[factorRequest.name] = factor;
    }
  }
  return factors;
}

