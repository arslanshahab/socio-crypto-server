import { Secrets } from "../util/secrets";
import Stripe from "stripe";

const { NODE_ENV = "development" } = process.env;

export class StripeAPI {
    public static client: Stripe;

    public static initialize() {
        StripeAPI.client = new Stripe(Secrets.stripeApiKey, {
            apiVersion: "2020-08-27",
        });
    }

    public static async createCustomer() {
        return StripeAPI.client.customers.create();
    }

    public static async setupIntent(customerId: string) {
        return StripeAPI.client.setupIntents.create({
            customer: customerId,
        });
    }

    public static async constructWebhookEvent(
        payload: string | Buffer,
        header: string | Buffer | Array<string>,
        secret: string
    ) {
        return StripeAPI.client.webhooks.constructEvent(payload, header, secret);
    }

    public static async chargePaymentMethod(
        amount: string,
        customerId: string,
        paymentMethodId: string,
        transferId: string
    ) {
        try {
            const paymentIntent = await StripeAPI.client.paymentIntents.create({
                amount: parseInt(amount),
                currency: "usd",
                customer: customerId,
                payment_method: paymentMethodId,
                off_session: false,
                confirm: true,
                metadata: {
                    transferId,
                    stage: NODE_ENV,
                },
            });
            return {
                id: paymentIntent.id,
                clientSecret: paymentIntent.client_secret,
                amount: paymentIntent.amount,
            };
        } catch (err) {
            console.log("Error code is: ", err.code);
            if (err.raw.payment_intent && err.raw.payment_intent.id) {
                const paymentIntentRetrieved = await StripeAPI.client.paymentIntents.retrieve(
                    err.raw.payment_intent.id
                );
                console.log("PI retrieved: ", paymentIntentRetrieved.id);
            }
        }
        return;
    }

    public static async listPaymentMethods(customerId: string) {
        return StripeAPI.client.paymentMethods.list({
            customer: customerId,
            type: "card",
        });
    }

    public static async getPaymentMethod(paymentMethodId: string) {
        return StripeAPI.client.paymentMethods.retrieve(paymentMethodId);
    }

    public static async removePaymentMethod(paymentMethodId: string) {
        return StripeAPI.client.paymentMethods.detach(paymentMethodId);
    }
}
