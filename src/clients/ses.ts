import * as AWS from 'aws-sdk';
import {Transfer} from '../models/Transfer';

const { NODE_ENV = "development" } = process.env;

AWS.config.update({ region: 'us-west-1' });

const { REWARD_REDEMPTION_EMAIL_RECIPIENT = "alex@dragonchain.com" } = process.env;

export class SesClient {
  public static client = new AWS.SES();

  public static getTemplate(title: string, body: string, subject: string) {
    return {
      Destination: {
        ToAddresses: [REWARD_REDEMPTION_EMAIL_RECIPIENT]
      },
      Message: {
        Body: {
          Html: {
            Charset: 'UTF-8',
            Data: `<html><body>${title}<br>${body.replace(/\n/g, '<br>')}</body></html>`
          },
          Text: {
            Charset: 'UTF-8',
            Data: `${title}\t\n${body}`
          }
        },
        Subject: {
          Charset: 'UTF-8',
          Data: subject
        }
      },
      ReturnPath: 'support@raiinmaker.com',
      Source: 'support@raiinmaker.com'
    }
  }

  public static async sendRedemptionConfirmationEmail(userId: string, paypalEmail: string, amountUSD: string, transfers: Transfer[]): Promise<boolean> {
    const title = `You have approved the reward redemptions for user ${userId}`;
    let text = `Please send $${amountUSD} to ${paypalEmail}\nTransfer Included:\n`;
    transfers.forEach(transfer => text += `Transfer ID: ${transfer.id} Amount (COIIN): ${transfer.amount} Redeemed At: ${transfer.createdAt}\n`);
    const template = SesClient.getTemplate(title, text, (NODE_ENV !== 'production' ? 'TEST EMAIL DO NOT SEND MONEY' : 'Raiinmaker Rewards Redemption Notification'));
    try {
      const data = await SesClient.client.sendEmail(template).promise();
      console.log(`Email sent to ${REWARD_REDEMPTION_EMAIL_RECIPIENT}, ${JSON.stringify(data)}`);
      return true;
    } catch (error) {
      console.error('Error occurred while sending email')
      console.error(error);
      return false;
    }
  }
}