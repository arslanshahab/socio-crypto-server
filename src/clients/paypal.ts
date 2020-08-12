import fetch from 'node-fetch';
import {PaypalPayout} from "../types";
import { v4 as uuidv4 } from 'uuid';
import { promisify } from 'util';
import {S3Client} from "./s3";
import logger from "../util/logger";
import {wait} from "../controllers/helpers";
const paypal = require('paypal-rest-sdk');

const clientId = 'AbWAuCaI8CmZyfER52cY3SuSAAMc7LmMqhWgbM1Fy4N1A09pKlDWJZW_X7odJeWGWTvReoSciWvis0t_';
const clientSecret = 'EL0IpTlVyqn79Lg2S9EDMOQD8pWnegFOcKYiY_8jK9gQ_xDIALq4ZYk0GVt8BTEYfPUoX8tWCbxan6P7';
paypal.configure({
    'mode': 'sandbox', //sandbox or live
    'client_id': clientId,
    'client_secret': clientSecret
});


const { NODE_ENV = 'development' } = process.env;
// const sandboxAccessToken = 'Bearer A21AAFnBvibhgA4ORXP_8RfdwJtlVP9pSF5ZmVvoXXZL3ERvJp3dG4qD_S1Yp087E0vdnIjolchfo1_g3BosbC0Pmr5cSkWww';

export class Paypal {
    public static baseUrl = NODE_ENV === 'production' ? 'https://api.paypal.com' : 'https://api.sandbox.paypal.com';
    public static webhookId = '4DP6580501488881N';
    private static verifyWebhook = promisify(paypal.notification.webhookEvent.verify);

    public static async submitPayouts(body: PaypalPayout[]) {
        const path = '/v1/payments/payouts'
        const  payload = {
             sender_batch_header: {
                sender_batch_id: uuidv4(),
                email_subject: 'Your withdrawal has been processed',
                email_message: 'Your money has been sent to you via PayPal'
            },
            items: body
        }
        return await this.makeRequest(path, {
            method: 'POST',
            body: JSON.stringify(payload),
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${await Paypal.getToken()}`,
            }
        })
    }

    public static async refreshToken() {
        logger.debug('refreshing paypal token');
        const path = '/v1/oauth2/token';
        try {
            const response = await this.makeRequest(path, {
                method: 'POST',
                body: 'grant_type=client_credentials',
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded',
                    'Authorization': `Basic ${Buffer.from(`${clientId}:${clientSecret}`).toString('base64')}`
                }
            });
            console.log('TOKEN RESPONSE', response);
            return S3Client.refreshPaypalAccessToken(response['access_token']);
        } catch (e) {
            throw new Error(`failure refreshing paypal token ${e}`);
        }
    }

    public static async getToken() {
        return S3Client.getPaypalAccessToken();
    }

    public static async verify(headers: object, eventBody: object, webhookId: string = this.webhookId) {
        return await this.verifyWebhook(headers, eventBody, webhookId) as {verification_status: string; httpStatusCode: number};
    }

    public static async makeRequest (path: string, options: object, retry= 1) {
        let res;
        const retryLimit = 4;
        const backoffDurationInMs = 1000;
        const url = `${Paypal.baseUrl}${path}`;
        try {
            res = await fetch(url, options);
            const textResponse = await res.text();
            const responseLogMessage = `Paypal <- ${res.status} ${url} ${textResponse}`;
            if (!res.ok) {
                if (res.status === 401) await Paypal.refreshToken();
                logger.error(responseLogMessage);
                throw new Error(`Request to paypal failed. ${textResponse} `);
            }
            // logger.debug(responseLogMessage);
            return JSON.parse(textResponse);
        } catch (e) {
            logger.error('ERROR:', e.message, JSON.stringify(e));
            if (e.code) throw e; // re-throw our expected errors
            if (retry < retryLimit) {
                await wait(Math.pow(retry, 2) * backoffDurationInMs, Paypal.makeRequest(path, options, retry + 1));
            } else {
                throw new Error('paypal request failure');
            }
        }
    }
}
