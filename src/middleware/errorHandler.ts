import { Request, Response, NextFunction } from 'express';
import logger from '../util/logger';
import {GraphQLError} from "graphql";
import {FailureByDesign} from "../util/errors";

export const errorHandler = (err: any, _req: Request, res: Response, next: NextFunction) => {
  if (err) {
    logger.debug('Stack trace:', err.stack || 'Unknown');
    logger.error(JSON.stringify(err));
    return res.status(500).send(err.message);
  }
  return next();
};

export const getGraphQlError = (err: GraphQLError) => {
  const error = err.originalError as FailureByDesign;
  const surfaceError = { code: error.code || '', message: error.message || err.message}
  switch (error.code) {
    case 'auth/invalid-email':
      return {status: 400, ...surfaceError}
    case 'auth/email-already-exists':
      return { status: 409, ...surfaceError }
    case 'NOT_FOUND':
      return { status: 404, ...surfaceError };
    default:
      return { status: 500, code: 'INTERNAL_SERVER_ERROR', message: err.message }
  }
}
