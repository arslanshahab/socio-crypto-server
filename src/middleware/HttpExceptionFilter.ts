import { Catch, ExceptionFilterMethods, PlatformContext, ResponseErrorObject } from "@tsed/common";
import { Exception } from "@tsed/exceptions";
import { SentryClient } from "../clients/sentry";
import { errorMap, SOMETHING_WENT_WRONG } from "../util/errors";

/**
 * Processes all error responses
 * based on https://tsed.io/docs/exceptions.html#exception-filter
 */
@Catch(Error)
export class HttpExceptionFilter implements ExceptionFilterMethods {
    public catch(exception: Exception, ctx: PlatformContext) {
        const { response, logger } = ctx;
        const error = this.mapError(exception);
        const headers = this.getHeaders(exception);

        logger.error({ exception });
        SentryClient.captureException(exception);

        response.setHeaders(headers).status(error.status).body(error);
    }

    protected mapError(error: any) {
        const code = errorMap[error.message] ? error.message : SOMETHING_WENT_WRONG;
        const message = errorMap[error.message] ? errorMap[error.message] : error.message;
        return {
            success: false,
            name: error.origin?.name || error.name,
            code,
            message,
            status: error.status || 500,
            errors: this.getErrors(error),
        };
    }

    protected getErrors(error: any) {
        return [error, error.origin].filter(Boolean).reduce((errs, { errors }: ResponseErrorObject) => {
            return [...errs, ...(errors || [])];
        }, []);
    }

    protected getHeaders(error: any) {
        return [error, error.origin].filter(Boolean).reduce((obj, { headers }: ResponseErrorObject) => {
            return {
                ...obj,
                ...(headers || {}),
            };
        }, {});
    }
}
