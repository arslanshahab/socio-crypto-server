type errorCode =
    | 'SYSTEM_ERROR'
    | 'MALFORMED_INPUT'
    | 'FAILURE_BY_DESIGN'
    | 'UNAUTHORIZED'
    | 'FORBIDDEN'
    | 'NOT_FOUND'
    | 'SUBSYSTEM_FAILURE'
    | 'DEPRECATED_ROUTE';

export class FailureByDesign extends Error {
    public code: errorCode;
    public message: any;

    public constructor(code: errorCode, message: any) {
        super(message);
        this.code = code;
        this.message = message || '';
    }
}
