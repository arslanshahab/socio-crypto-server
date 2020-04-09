import { Request } from 'express';

export const constructHostUrl = (request: Request) => `${request.protocol}://${request.get('host')}`;