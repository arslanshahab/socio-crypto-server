import AWS from 'aws-sdk';
import {getBase64FileExtension} from '../util/helpers';

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

  public static async getUserObject(userId: string) {
    try {
      const params: AWS.S3.GetObjectRequest = { Bucket: BUCKET_NAME, Key: `kyc/${userId}` }
      return JSON.parse((await S3Client.client.getObject(params).promise()).Body!.toString());
    } catch (e) {
      throw new Error('kyc not found');
    }
  }

  public static async postUserInfo(userId: string, body: any) {
    const doesExistParams = {
      Bucket: BUCKET_NAME,
      Key: `kyc/${userId}`
    }
    await this.client.waitFor('objectExists', doesExistParams, (err, data) => {
      if (err) return;
      if (data) throw Error('user already exists');
    });
    const params: AWS.S3.PutObjectRequest = { Bucket: BUCKET_NAME, Key: `kyc/${userId}`, Body: JSON.stringify(body)}
    await this.client.putObject(params).promise();
  }

  public static async updateUserInfo(userId: string, kycUser: {[key: string]: string}) {
    const userObject: {[key: string] : any} = await this.getUserObject(userId);
    for (const key in kycUser) {
      userObject[key] = kycUser[key];
    }
    const params: AWS.S3.PutObjectRequest = { Bucket: BUCKET_NAME, Key: `kyc/${userId}`, Body: JSON.stringify(userObject)}
    await this.client.putObject(params).promise();
    return userObject
  }
}
