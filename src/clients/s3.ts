import AWS from 'aws-sdk';
import {getBase64FileExtension} from '../util/helpers';

const { BUCKET_NAME = "raiinmaker-staging", KYC_BUCKET_NAME = "raiinmaker-kyc-staging" } = process.env;

export class S3Client {
  public static client = new AWS.S3({region: 'us-west-2'});

  public static async setCampaignImage(type: string, campaignId: string, image: string) {
    const extension = getBase64FileExtension(image);
    const filename = `${type}.${extension.split('/')[1]}`;
    const key = `campaign/${campaignId}/${filename}`;
    const params: AWS.S3.PutObjectRequest = {
      Bucket: BUCKET_NAME,
      Key: key,
      Body: Buffer.from(image.replace(/^data:image\/\w+;base64,/, ""), 'base64'),
      ContentEncoding: 'base64',
      ContentType: extension
    };
    await S3Client.client.putObject(params).promise();
    return filename;
  }

  public static async getUserObject(userId: string) {
    try {
      const params: AWS.S3.GetObjectRequest = {Bucket: KYC_BUCKET_NAME, Key: `kyc/${userId}`}
      const start = new Date().getTime();
      const object = JSON.parse((await S3Client.client.getObject(params).promise()).Body!.toString());
      const end = new Date().getTime();
      console.log('S3-get execution time is: ', end - start, 'milliseconds');
      return object;
    } catch (e) {
      throw new Error('kyc not found');
    }
  }

  public static async postUserInfo(userId: string, body: any) {
    const doesExistParams = {
      Bucket: KYC_BUCKET_NAME,
      Key: `kyc/${userId}`
    }
    try {
      await this.client.headObject(doesExistParams).promise();
      throw new Error('data already here');
    } catch(e){
      if (e.code && e.code === 'NotFound') {
        const params: AWS.S3.PutObjectRequest = {Bucket: KYC_BUCKET_NAME, Key: `kyc/${userId}`, Body: JSON.stringify(body)}
        return await this.client.putObject(params).promise();
      }
      throw e;
    }
  }

  public static async updateUserInfo(userId: string, kycUser: {[key: string]: string}) {
    const userObject: {[key: string] : any} = await this.getUserObject(userId);
    for (const key in kycUser) {
      userObject[key] = kycUser[key];
    }
    const params: AWS.S3.PutObjectRequest = { Bucket: KYC_BUCKET_NAME, Key: `kyc/${userId}`, Body: JSON.stringify(userObject)}
    await this.client.putObject(params).promise();
    return userObject
  }
}
