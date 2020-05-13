import { Response } from 'express';
import { asyncHandler } from '../util/helpers';
import { AuthRequest } from '../types';


export const login = asyncHandler(async (req: AuthRequest, res: Response) => {
  return res.status(200).json({ success: true, token: 'banana' });
});