import { ApolloError } from "apollo-server-express";
import { JsonWebTokenError, TokenExpiredError } from "jsonwebtoken";

export class FailureByDesign extends Error {
    public code: string;
    public message: string;

    public constructor(code: string, message: any) {
        super(message);
        this.code = code || "FAILURE_BY_DESIGN";
        this.message = message || "";
    }
}

export class FormattedError extends ApolloError {
    public code: string;
    public message: string;

    public constructor(error: any) {
        console.log(error);
        let code = SOMETHING_WENT_WRONG;
        if (error.name === TokenExpiredError.name || error.name === JsonWebTokenError.name) code = SESSION_EXPIRED;
        if (error.name === Error.name) code = errorMap[error.message] ? error.message : SOMETHING_WENT_WRONG;
        if (code === SOMETHING_WENT_WRONG) console.log(error);
        let errorMessage = error instanceof ApolloError ? error.message : errorMap[code];
        super(errorMessage, code);
        this.code = code;
        this.message = errorMessage;
    }
}

export const SESSION_EXPIRED = "SESION_EXPIRED";
export const INVALID_TOKEN = "INVALID_TOKEN";
export const SOMETHING_WENT_WRONG = "SOMETHING_WENT_WRONG";
export const MISSING_PARAMS = "MISSING_PARAMS";
export const EMAIL_EXISTS = "EMAIL_EXISTS";
export const USERNAME_EXISTS = "USERNAME_EXISTS";
export const USERNAME_NOT_EXISTS = "USERNAME_NOT_EXISTS";
export const EMAIL_NOT_EXISTS = "EMAIL_NOT_EXISTS";
export const EMAIL_NOT_VERIFIED = "EMAIL_NOT_VERIFIED";
export const INCORRECT_PASSWORD = "INCORRECT_PASSWORD";
export const SAME_OLD_AND_NEW_PASSWORD = "SAME_OLD_AND_NEW_PASSWORD";
export const INCORRECT_CODE = "INCORRECT_CODE";
export const USER_NOT_FOUND = "USER_NOT_FOUND";
export const INCORRECT_CODE_OR_EMAIL = "INCORRECT_CODE_OR_EMAIL";
export const NO_TOKEN_PROVIDED = "NO_TOKEN_PROVIDED";
export const ERROR_LINKING_TIKTOK = "ERROR_LINKING_TIKTOK";
export const GLOBAL_CAMPAIGN_NOT_FOUND = "GLOBAL_CAMPAIGN_NOT_FOUND";
export const VERIFICATION_TOKEN_EXPIRED = "VERIFICATION_TOKEN_EXPIRED";

const errorMap: { [key: string]: string } = {
    SOMETHING_WENT_WRONG: "Something went wrong with your request. please try again!",
    NO_TOKEN_PROVIDED: "Access token is missing.",
    MISSING_PARAMS: "Missing required parameters.",
    EMAIL_EXISTS: "A user has already registered with this email.",
    USER_EMAIL_EXISTS: "User has already attached his email address.",
    EMAIL_NOT_VERIFIED: "Provided email isn't verfied by our system.",
    EMAIL_NOT_EXISTS: "Provided email doesn't exist in our records.",
    INCORRECT_PASSWORD: "Password is not correct, please try again.",
    USER_NOT_FOUND: "No user found against provided parameters.",
    USERNAME_NOT_EXISTS: "Provided username doesn't exist in our records.",
    INCORRECT_CODE: "Provided code is not correct.",
    USERNAME_EXISTS: "A user has already registered with this username.",
    SESION_EXPIRED: "Session expired, please login again.",
    INVALID_TOKEN: "Provided token is not valid",
    INCORRECT_CODE_OR_EMAIL: "Invalid code or verification not initialized",
    SAME_OLD_AND_NEW_PASSWORD: "Current pass and old password cannot be same, please set a different password",
    ERROR_LINKING_TIKTOK: "There was an error linking your tiktok social account.",
    GLOBAL_CAMPAIGN_NOT_FOUND: "Global campaign doesn't exists.",
    VERIFICATION_TOKEN_EXPIRED: "Verification token expired.",
};
