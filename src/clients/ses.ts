import * as AWS from "aws-sdk";
import { Campaign } from "../models/Campaign";
import { Transfer } from "../models/Transfer";

const { NODE_ENV = "development" } = process.env;

AWS.config.update({ region: "us-west-1" });

AWS.config.update({
    accessKeyId: "AKIAXVQVYPRMDO5IO3FE",
    secretAccessKey: "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",
});

const { REWARD_REDEMPTION_EMAIL_RECIPIENT = "alex@dragonchain.com" } = process.env;

export class SesClient {
    public static client = new AWS.SES();

    public static getTemplate(title: string, body: string, subject: string, recipient: string) {
        recipient = recipient ? recipient : REWARD_REDEMPTION_EMAIL_RECIPIENT;
        return {
            Destination: {
                ToAddresses: [recipient],
            },
            Message: {
                Body: {
                    Html: {
                        Charset: "UTF-8",
                        Data: `<html><body>${title}<br>${body.replace(/\n/g, "<br>")}</body></html>`,
                    },
                    Text: {
                        Charset: "UTF-8",
                        Data: `${title}\t\n${body}`,
                    },
                },
                Subject: {
                    Charset: "UTF-8",
                    Data: subject,
                },
            },
            ReturnPath: "support@raiinmaker.com",
            Source: "support@raiinmaker.com",
        };
    }

    public static async sendRedemptionConfirmationEmail(
        userId: string,
        paypalEmail: string,
        amountUSD: string,
        transfers: Transfer[]
    ): Promise<boolean> {
        const title = `You have approved the reward redemptions for user ${userId}`;
        let text = `Please send $${amountUSD} to ${paypalEmail}\nTransfer Included:\n`;
        transfers.forEach(
            (transfer) =>
                (text += `Transfer ID: ${transfer.id} Amount (COIIN): ${transfer.amount} Redeemed At: ${transfer.createdAt}\n`)
        );
        const template = SesClient.getTemplate(
            title,
            text,
            NODE_ENV !== "production" ? "TEST EMAIL DO NOT SEND MONEY" : "Raiinmaker Rewards Redemption Notification",
            REWARD_REDEMPTION_EMAIL_RECIPIENT
        );
        try {
            const data = await SesClient.client.sendEmail(template).promise();
            console.log(`Email sent to ${REWARD_REDEMPTION_EMAIL_RECIPIENT}, ${JSON.stringify(data)}`);
            return true;
        } catch (error) {
            console.error("Error occurred while sending email");
            console.error(error);
            return false;
        }
    }

    public static async sendNewOrgConfirmationEmail(orgName: string, email: string, tempPassword: string) {
        const title = `Your brand ${orgName} has been created on Raiinmaker`;
        const text = `Please login with email: ${email} and temporary password ${tempPassword}. Please change password upon initial login\n`;
        const template = SesClient.getTemplate(title, text, "New Brand Account on Raiinmaker!", email);
        try {
            const data = await SesClient.client.sendEmail(template).promise();
            console.log(`Email sent to ${email} to confirm creation of brand account on Raiinmaker: ${data}`);
            return true;
        } catch (e) {
            console.error("Error occurred while sending email");
            console.error(e);
            return false;
        }
    }

    public static async sendNewUserConfirmationEmail(orgName: string, email: string, tempPassword: string) {
        const title = `Welcome to your new Raiinmaker account for ${orgName}`;
        const text = `Please login with email: ${email} and temporary password ${tempPassword}. Please change password upon initial login`;
        const template = SesClient.getTemplate(title, text, "New Raiinmaker User", email);
        try {
            const data = await SesClient.client.sendEmail(template).promise();
            console.log(`Email sent to ${email} to confirm creation of brand account on Raiinmaker: ${data}`);
            return true;
        } catch (e) {
            console.error("Error occurred while sending email");
            console.error(e);
            return false;
        }
    }

    public static async sendRafflePrizeRedemptionEmail(userId: string, emailAddress: string, campaign: Campaign) {
        const title = `A raffle prize winner has been chosen for campaign: ${campaign.name}`;
        const text = `A winner, ${userId}, has been chosen for the campaign ${campaign.name}. \n Please contact the user at ${emailAddress} to coordinate sending of prize.`;
        const template = SesClient.getTemplate(
            title,
            text,
            "Raffle Campaign Has Been Audited",
            REWARD_REDEMPTION_EMAIL_RECIPIENT
        );
        try {
            const data = await SesClient.client.sendEmail(template).promise();
            console.log(`Email sent to ${REWARD_REDEMPTION_EMAIL_RECIPIENT}, ${JSON.stringify(data)}`);
            return true;
        } catch (error) {
            console.error("Error occurred while sending email");
            console.error(error);
            return false;
        }
    }

    public static async emailAddressVerificationEmail(emailAddress: string, otp: string) {
        const title = `Verify your email address`;
        const text = `Please use this code to verify your email address: ${otp}`;
        const template = SesClient.getTemplate(title, text, "Verify Email Address", emailAddress);
        try {
            const data = await SesClient.client.sendEmail(template).promise();
            console.log(`Email sent to ${emailAddress}, ${JSON.stringify(data)}`);
            return true;
        } catch (error) {
            console.error("Error occurred while sending email");
            console.error(error);
            throw new Error(error.message);
        }
    }
}
