import * as Sentry from "@sentry/node";

export class SentryClient {
    public static captureException = (e: any) => {
        return Sentry.captureException(e);
    };

    public static captureMessage = (msg: string) => {
        return Sentry.captureMessage(msg);
    };

    public static captureEvent = (event: any) => {
        return Sentry.captureEvent(event);
    };
}
