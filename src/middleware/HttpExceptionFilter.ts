import { Catch, ExceptionFilterMethods, PlatformContext, ResponseErrorObject } from "@tsed/common";
import { Exception } from "@tsed/exceptions";

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

        logger.error({ error });

        response.setHeaders(headers).status(error.status).body(error);
    }

    protected mapError(error: any) {
        return {
            success: false,
            name: error.origin?.name || error.name,
            message: error.message,
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
