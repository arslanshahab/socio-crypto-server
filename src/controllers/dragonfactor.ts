import { Request, Response } from 'express';
import { asyncHandler } from '../util/helpers';

export const login = asyncHandler(async (req: Request, res: Response) => {
  console.log((req as any).user);
  return res.status(200).json({ success: true, token: 'banana' });
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