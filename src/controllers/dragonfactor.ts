import { Request, Response } from 'express';
import { asyncHandler } from '../util/helpers';
import { Validator } from '../util/validator';
import { DragonfactorLoginRequest, GenericFactor } from '../types';
import {
  verifyFactor,
  verifyCrossSigning,
  verifyLoginRequestSignature,
} from '../util/crypto';

const validFactors = ['email'];
const validator = new Validator();
const TIME_DIFFERENCE = 10000; // 5 seconds in milliseconds

export const login = asyncHandler(async (req: Request, res: Response) => {
  console.log(req.body);
  validator.validateDragonfactorLogin(req.body);
  console.log('validated body');
  const factorRequest: DragonfactorLoginRequest = req.body;
  if (!validFactors.includes(factorRequest.factorType)) return res.status(403).json({ code: 'UNAUTHORIZED', message: 'unauthorized' });
  console.log('factor is an accepted type');
  // check that the timestamp is within acceptable bounds
  if (new Date(factorRequest.timestamp).getUTCMilliseconds() > new Date().getUTCMilliseconds()) return res.status(403).json({ code: 'UNAUTHORIZED', message: 'unauthorized' });
  console.log('timestamp is not in the future');
  if (new Date().getUTCMilliseconds() - new Date(factorRequest.timestamp).getUTCMilliseconds() > TIME_DIFFERENCE) return res.status(403).json({ code: 'UNAUTHORIZED', message: 'unauthorized' });
  console.log('timestamp is within valid timestamp');
  const factor: GenericFactor = JSON.parse(factorRequest.factor);
  if (!verifyLoginRequestSignature(factorRequest)) return res.status(403).json({ code: 'UNAUTHORIZED', message: 'unauthorized' });
  console.log('login request signature is valid');
  if (!verifyFactor(factor)) return res.status(403).json({ code: 'UNAUTHORIZED', message: 'unauthorized' });
  console.log('factor is valid');
  if (!verifyCrossSigning(factorRequest.factorAssociation, factorRequest.signingPublicKey)) return res.status(403).json({ code: 'UNAUTHORIZED', message: 'unauthorized' });
  // handle either signing in or signing up here
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