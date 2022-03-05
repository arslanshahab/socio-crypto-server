import * as Sentry from "@sentry/node";

export class SentryClient {
    public static client = Sentry;

    public static captureException = (e: any) => {
        return SentryClient.client.captureException(e);
    };

    public static captureMessage = (msg: string) => {
        return SentryClient.client.captureMessage(msg);
    };

    public static captureEvent = (event: any) => {
        return SentryClient.client.captureEvent(event);
    };
}
