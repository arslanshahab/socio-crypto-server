import * as AWS from 'aws-sdk';
import logger from '../util/logger';

const TopicArn =
  process.env.NODE_ENV === 'production' ? 'arn:aws:sns:us-west-2:381978683274:ers-production-Topic-LP3TJOCU3EWE' : 'arn:aws:sns:us-west-2:381978683274:ers-staging-Topic-SVYROUMXZY3V';

export class SNS {
  public static client = new AWS.SNS({ region: 'us-west-2' });

  public static async sendErrorReport(error: Error) {
    logger.debug(`Sending error to Topic ${TopicArn}: ${error}`);
    const errorReport = SNS.craftErrorReport(error);
    const response = await SNS.client.publish({ Message: errorReport, TopicArn }).promise();
    logger.debug(`Response: ${JSON.stringify(response)}`);
    return response.MessageId;
  }

  public static craftErrorReport(error: Error) {
    return JSON.stringify({
      app: 'Raiinmaker',
      timestamp: Math.floor(Date.now() / 1000),
      message: error.message,
      stack_trace: error.stack // eslint-disable-line @typescript-eslint/camelcase
    });
  }
}
