import fetch from 'node-fetch';
import { Request, Response } from 'express';
import { asyncHandler } from '../util/helpers';

const validFactors = ['email'];

export const login = asyncHandler(async (req: Request, res: Response) => {

});

// {
//   "service": "raiinmaker",
//   "factorType": "email/phone",
//   "timestamp": "2020-...",
//   "factor": "stringifiedFactor",
//   "signingPublicKey": "pubKey",
//   "factorAssociationPublicKey": "faPubKey",
//   "signature": "signature of all that is above here"
// }