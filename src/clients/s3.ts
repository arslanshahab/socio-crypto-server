import AWS from "aws-sdk";
import { getBase64FileExtension, deleteFactorFromKycData } from "../util/helpers";
import { KycUser } from "../types";

const {
    BUCKET_NAME = "rm-raiinmaker-staging",
    KYC_BUCKET_NAME = "rm-raiinmaker-kyc-staging",
    RM_SECRETS = "rm-secrets-staging",
    TATUM_WALLETS = "tatum-wallets-stage",
} = process.env;

export class S3Client {
    public static client = new AWS.S3({ region: "us-west-1", signatureVersion: "v4" });

    public static async setCampaignImage(type: string, campaignId: string, image: string) {
        const extension = getBase64FileExtension(image);
        const filename = `${type}.${extension.split("/")[1]}`;
        const key = `campaign/${campaignId}/${filename}`;
        const params: AWS.S3.PutObjectRequest = {
            Bucket: BUCKET_NAME,
            Key: key,
            Body: Buffer.from(image.replace(/^data:image\/\w+;base64,/, ""), "base64"),
            ContentEncoding: "base64",
            ContentType: extension,
        };
        await S3Client.client.putObject(params).promise();
        return filename;
    }

    public static async setCampaignRafflePrizeImage(campaignId: string, rafflePrizeId: string, image: string) {
        const extension = getBase64FileExtension(image);
        const key = `rafflePrize/${campaignId}/${rafflePrizeId}`;
        const params: AWS.S3.PutObjectRequest = {
            Bucket: BUCKET_NAME,
            Key: key,
            Body: Buffer.from(image.replace(/^data:image\/\w+;base64,/, ""), "base64"),
            ContentEncoding: "base64",
            ContentType: extension,
        };
        await S3Client.client.putObject(params).promise();
        return;
    }

    public static async generateCampaignSignedURL(key: string) {
        return S3Client.client.getSignedUrl("putObject", {
            Bucket: BUCKET_NAME || "rm-raiinmaker-staging",
            Key: key,
            Expires: 3600,
        });
    }

    public static async generateRafflePrizeSignedURL(key: string) {
        return S3Client.client.getSignedUrl("putObject", { Bucket: BUCKET_NAME, Key: key, Expires: 3600 });
    }

    public static async getUserObject(userId: string): Promise<KycUser> {
        try {
            const params: AWS.S3.GetObjectRequest = { Bucket: KYC_BUCKET_NAME, Key: `kyc/${userId}` };
            const start = new Date().getTime();
            const object = JSON.parse((await S3Client.client.getObject(params).promise()).Body!.toString());
            const end = new Date().getTime();
            console.log("S3-get execution time is: ", end - start, "milliseconds");
            return object;
        } catch (e) {
            throw new Error("kyc not found");
        }
    }

    public static async deleteKycElement(userId: string, elementKey: string) {
        try {
            let userObject = await S3Client.getUserObject(userId);
            userObject = deleteFactorFromKycData(userObject, elementKey);
            await S3Client.putObject(userId, userObject);
        } catch (error) {
            console.log("kyc not found, but not throwing");
        }
        return;
    }

    public static async deleteKycData(kycId: string) {
        const params: AWS.S3.DeleteObjectRequest = { Bucket: KYC_BUCKET_NAME, Key: kycId };
        try {
            return await this.client.deleteObject(params).promise();
        } catch (_) {
            return null;
        }
    }

    public static async uploadKycImage(userId: string, type: string, image: string) {
        const params: AWS.S3.PutObjectRequest = {
            Bucket: KYC_BUCKET_NAME,
            Key: `images/${userId}/${type}`,
            Body: image,
        };
        try {
            await this.client.putObject(params).promise();
        } catch (e) {
            console.error(`Error posting image: ${type} for user: ${userId}`);
            throw e;
        }
    }

    public static async getKycImage(userId: string, type: string): Promise<string | undefined> {
        const params: AWS.S3.GetObjectRequest = { Bucket: KYC_BUCKET_NAME, Key: `images/${userId}/${type}` };
        try {
            const responseString = (await this.client.getObject(params).promise()).Body?.toString();
            return responseString;
        } catch (e) {
            if (e.code && e.code === "NotFound") return;
            throw e;
        }
    }

    public static async getKycFactors(kycId: string): Promise<string | undefined> {
        const params: AWS.S3.GetObjectRequest = { Bucket: KYC_BUCKET_NAME, Key: kycId };
        try {
            return JSON.parse((await S3Client.client.getObject(params).promise()).Body!.toString());
        } catch (e) {
            if (e.code && e.code === "NotFound") return;
            throw e;
        }
    }

    public static async deleteKycImage(userId: string, type: string) {
        const params: AWS.S3.DeleteObjectRequest = { Bucket: KYC_BUCKET_NAME, Key: `images/${userId}/${type}` };
        try {
            return await this.client.deleteObject(params).promise();
        } catch (_) {
            return null;
        }
    }

    public static async postUserInfo(userId: string, body: any) {
        const doesExistParams = {
            Bucket: KYC_BUCKET_NAME,
            Key: `kyc/${userId}`,
        };
        try {
            await this.client.headObject(doesExistParams).promise();
            throw new Error("data already here");
        } catch (e) {
            if (e.code && e.code === "NotFound") {
                const params: AWS.S3.PutObjectRequest = {
                    Bucket: KYC_BUCKET_NAME,
                    Key: `kyc/${userId}`,
                    Body: JSON.stringify(body),
                };
                return await this.client.putObject(params).promise();
            }
            throw e;
        }
    }

    public static async updateUserInfo(userId: string, kycUser: KycUser) {
        const userObject: any = await this.getUserObject(userId);
        for (const key in kycUser) {
            userObject[key] = (kycUser as any)[key];
        }
        const params: AWS.S3.PutObjectRequest = {
            Bucket: KYC_BUCKET_NAME,
            Key: `kyc/${userId}`,
            Body: JSON.stringify(userObject),
        };
        await this.client.putObject(params).promise();
        return userObject;
    }

    public static async putObject(userId: string, userObject: any) {
        const params: AWS.S3.PutObjectRequest = {
            Bucket: KYC_BUCKET_NAME,
            Key: `kyc/${userId}`,
            Body: JSON.stringify(userObject),
        };
        await this.client.putObject(params).promise();
    }

    public static async deleteUserInfoIfExists(userId: string) {
        try {
            const params: AWS.S3.DeleteObjectRequest = { Bucket: KYC_BUCKET_NAME, Key: `kyc/${userId}` };
            const response = await this.client.deleteObject(params).promise();
            console.log(`Deleted KYC data for ${userId}`, response);
        } catch (e) {
            if (!e.code || e.code !== "NotFound")
                throw new Error("An unexpected error occurred while attempting to delete kyc data");
            console.log(`No KYC data was found to be delete for ${userId}`);
        }
    }

    public static async refreshPaypalAccessToken(token: string) {
        const params: AWS.S3.PutObjectRequest = { Bucket: KYC_BUCKET_NAME, Key: "paypal/accessToken", Body: token };
        try {
            await this.client.putObject(params).promise();
            return token;
        } catch (e) {
            throw e;
        }
    }

    public static async getPaypalAccessToken() {
        const params: AWS.S3.GetObjectRequest = { Bucket: KYC_BUCKET_NAME, Key: "paypal/accessToken" };
        try {
            return (await this.client.getObject(params).promise()).Body?.toString();
        } catch (e) {
            if (e.code && e.code === "NotFound") return null;
            throw e;
        }
    }

    public static async getLastCheckedBillingBlock() {
        const params: AWS.S3.GetObjectRequest = { Bucket: BUCKET_NAME, Key: "billingWatcher/lastCheckedBlock" };
        try {
            return (await this.client.getObject(params).promise()).Body?.toString();
        } catch (e) {
            if (e.code && e.code === "NoSuchKey") return null;
            throw e;
        }
    }

    public static async setLastCheckedBillingBlock(blockNumber: number) {
        const params: AWS.S3.PutObjectRequest = {
            Bucket: BUCKET_NAME,
            Key: "billingWatcher/lastCheckedBlock",
            Body: blockNumber.toString(),
        };
        return await this.client.putObject(params).promise();
    }

    public static async getMissedBillingTransfers() {
        const params: AWS.S3.GetObjectRequest = { Bucket: BUCKET_NAME, Key: "billingWatcher/missedTransfers" };
        try {
            return JSON.parse((await this.client.getObject(params).promise()).Body!.toString());
        } catch (e) {
            if (e.code && e.code === "NoSuchKey") return [];
            throw e;
        }
    }

    public static async uploadMissedTransfers(transfers: any[]) {
        const params: AWS.S3.PutObjectRequest = {
            Bucket: BUCKET_NAME,
            Key: "billingWatcher/missedTransfers",
            Body: JSON.stringify(transfers),
        };
        return await this.client.putObject(params).promise();
    }

    public static async uploadProfilePicture(type: string, userId: string, image: string) {
        const extension = getBase64FileExtension(image);
        const filename = `${type}.${extension.split("/")[1]}`;
        const params: AWS.S3.PutObjectRequest = {
            Bucket: BUCKET_NAME,
            Key: `profile/${userId}/${filename}`,
            ContentEncoding: "base64",
            ContentType: extension,
            CacheControl: "no-cache",
            Body: Buffer.from(image.replace(/^data:image\/\w+;base64,/, ""), "base64"),
        };
        await this.client.putObject(params).promise();
        return filename;
    }

    public static async refreshXoxodayAuthData(authData: string) {
        const params: AWS.S3.PutObjectRequest = {
            Bucket: RM_SECRETS,
            Key: "xoxoday/authData",
            Body: JSON.stringify(authData),
        };
        try {
            return await this.client.putObject(params).promise();
        } catch (e) {
            throw e;
        }
    }

    public static async getXoxodayAuthData() {
        const params: AWS.S3.GetObjectRequest = { Bucket: RM_SECRETS, Key: "xoxoday/authData" };
        try {
            return (await this.client.getObject(params).promise()).Body?.toString();
        } catch (e) {
            if (e.code && e.code === "NotFound") return null;
            throw e;
        }
    }

    public static async setLastCheckedTransactionTime(time: number) {
        const params: AWS.S3.PutObjectRequest = {
            Bucket: BUCKET_NAME,
            Key: "tatum/lastCheckedTime",
            Body: String(time),
        };
        return await this.client.putObject(params).promise();
    }

    public static async getLastCheckedTransactionTime() {
        const params: AWS.S3.GetObjectRequest = { Bucket: BUCKET_NAME, Key: "tatum/lastCheckedTime" };
        try {
            return (await this.client.getObject(params).promise()).Body?.toString();
        } catch (e) {
            throw e;
        }
    }

    public static async setTatumWalletKeys(currency: string, data: any) {
        const params: AWS.S3.PutObjectRequest = {
            Bucket: TATUM_WALLETS,
            Key: `${currency}-keys`,
            Body: JSON.stringify(data),
        };
        return await this.client.putObject(params).promise();
    }

    public static async getTatumWalletKeys(currency: string) {
        const params: AWS.S3.GetObjectRequest = { Bucket: TATUM_WALLETS, Key: `${currency}-keys` };
        try {
            return JSON.parse((await S3Client.client.getObject(params).promise()).Body!.toString());
        } catch (e) {
            throw e;
        }
    }
}
