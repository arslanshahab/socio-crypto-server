import AWS from 'aws-sdk';
import { getBase64FileExtension } from '../util/helpers';

const { BUCKET_NAME = "raiinmaker-staging" } = process.env;

export class S3Client {
  public static client = new AWS.S3({ region: 'us-west-2' });

  public static async setCampaignImage(type: string, campaignId: string, image: string) {
    const extension = getBase64FileExtension(image);
    const filename = `${type}.${extension.split('/')[1]}`;
    const key = `campaign/${campaignId}/${filename}`;
    const params: AWS.S3.PutObjectRequest = { Bucket: BUCKET_NAME, Key: key, Body: Buffer.from(image.replace(/^data:image\/\w+;base64,/, ""),'base64'), ContentEncoding: 'base64', ContentType: extension };
    await S3Client.client.putObject(params).promise();
    return filename;
  }
}