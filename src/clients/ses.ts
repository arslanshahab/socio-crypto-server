import * as AWS from 'aws-sdk';
import {Transfer} from '../models/Transfer';

const { NODE_ENV = "development" } = process.env;

AWS.config.update({ region: 'us-west-2' });

const { REWARD_REDEMPTION_EMAIL_RECIPIENT = "j@dragonchain.com" } = process.env;

export class SesClient {
  public static client = new AWS.SES();

  public static getTemplate(text: string, subject: string) {
    return {
      Destination: {
        ToAddresses: [REWARD_REDEMPTION_EMAIL_RECIPIENT]
      },
      Message: {
        Body: {
          Html: {
            Charset: 'UTF-8',
            Data: text.replace('\t\n', '<br />')
          },
          Text: {
            Charset: 'UTF-8',
            Data: text
          }
        },
        Subject: {
          Charset: 'UTF-8',
          Data: subject
        }
      },
      ReturnPath: 'support@dragonchain.com',
      Source: 'support@dragonchain.com'
    }
  }

  public static async sendRedemptionConfirmationEmail(userId: string, paypalEmail: string, amountUSD: string, transfers: Transfer[]): Promise<boolean> {
    let text = `You have approved the reward redemptions for user ${userId}\t\n\t\n Please send $${amountUSD} to ${paypalEmail}\t\nTransfer Included:\t\n`;
    transfers.forEach(transfer => text += `\t\nTransfer ID: ${transfer.id} Amount (COIIN): ${transfer.amount} Redeemed At: ${transfer.createdAt}`);
    const template = SesClient.getTemplate(text, (['staging','development'].includes(NODE_ENV) ? 'TEST EMAIL DO NOT SEND MONEY' : 'Raiinmaker Rewards Redemption Notification'));
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