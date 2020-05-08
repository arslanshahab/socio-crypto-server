import fetch from 'node-fetch';
import { GenericProvider } from '../types';

const { NODE_ENV = 'development' } = process.env;
const factorApiUrl = NODE_ENV !== 'development' ? 'https://factor.dragonchain.com' : 'https://factor-dev.dragonchain.com';

export class Dragonfactor {
  public static async getProvider(providerId: string): Promise<GenericProvider> {
    return Dragonfactor.makeRequest(`${factorApiUrl}/provider/${providerId}`);
  }

  public static async makeRequest(url: string) {
    const res = await fetch(url);
    if (!res.ok) throw new Error('Error retrieving provider');
    return res.json();
  }
}