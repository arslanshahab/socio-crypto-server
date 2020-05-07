import { Request, Response, NextFunction } from 'express';

export const getBase64FileExtension = (image: string) => {
  if (image === '') throw new Error('invalid image uploaded');
  return image.split(':')[1].split(';')[0];
}

export const asyncHandler = (fn: any) => (req: Request, res: Response, next: NextFunction) => {
  return Promise.resolve(fn(req, res, next)).catch(next);
};