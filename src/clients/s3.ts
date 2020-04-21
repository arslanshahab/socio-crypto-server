import AWS from 'aws-sdk';

const { BUCKET_NAME = "raiinmaker-staging" } = process.env;

export class S3Client {
  public static client = new AWS.S3();

  public static async setCampaignImage(campaignId: string, image: string) {
    const key = `campaign/${campaignId}`;
    const params = { Bucket: BUCKET_NAME, Key: key, Body: image };
    await S3Client.client.putObject(params).promise();
    return key;
  }
}