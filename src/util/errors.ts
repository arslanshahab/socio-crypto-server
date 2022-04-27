import { ApolloError } from "apollo-server-express";
import { JsonWebTokenError, TokenExpiredError } from "jsonwebtoken";
import { WITHDRAW_LIMIT } from "./constants";

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
        let code = SOMETHING_WENT_WRONG;
        if (error.name === TokenExpiredError.name || error.name === JsonWebTokenError.name) code = SESSION_EXPIRED;
        if (error.name === Error.name || error.name === ApolloError.name)
            code = errorMap[error.message] ? error.message : SOMETHING_WENT_WRONG;
        if (code === SOMETHING_WENT_WRONG) console.log(error);
        let errorMessage =
            error instanceof ApolloError || code === SOMETHING_WENT_WRONG ? error.message : errorMap[code];
        super(errorMessage, code);
        this.code = code;
        this.message = errorMessage;
    }

    public static isFormatted = (code: string) => {
        return code !== SOMETHING_WENT_WRONG;
    };
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
export const ERROR_LINKING_TWITTER = "ERROR_LINKING_TWITTER";
export const GLOBAL_CAMPAIGN_NOT_FOUND = "GLOBAL_CAMPAIGN_NOT_FOUND";
export const VERIFICATION_TOKEN_EXPIRED = "VERIFICATION_TOKEN_EXPIRED";
export const ORG_NOT_FOUND = "ORG_NOT_FOUND";
export const ERROR_CALCULATING_TIER = "ERROR_CALCULATING_TIER";
export const GLOBAL_CAMPAIGN_EXIST_FOR_CURRENCY = "GLOBAL_CAMPAIGN_EXIST_FOR_CURRENCY";
export const RAFFLE_PRIZE_MISSING = "RAFFLE_PRIZE_MISSING";
export const COMPANY_NOT_SPECIFIED = "COMPANY_NOT_SPECIFIED";
export const CURRENCY_NOT_SUPPORTED = "CURRENCY_NOT_SUPPORTED";
export const CURRENCY_NOT_FOUND = "CURRENCY_NOT_FOUND";
export const CAMPAIGN_NAME_EXISTS = "CAMPAIGN_NAME_EXISTS";
export const CAMPAIGN_NOT_FOUND = "CAMPAIGN_NOT_FOUND";
export const CAMPAIGN_ORGANIZATION_MISSING = "CAMPAIGN_ORGANIZATION_MISSING";
export const ADMIN_NOT_FOUND = "ADMIN_NOT_FOUND";
export const TRANSFER_NOT_FOUND = "TRANSFER_NOT_FOUND";
export const ESCROW_NOT_FOUND = "ESCROW_NOT_FOUND";
export const WALLET_NOT_FOUND = "WALLET_NOT_FOUND";
export const AMOUNT_IN_POSITIVE = "AMOUNT_IN_POSITIVE";
export const PARTICIPANT_NOT_FOUND = "PARTICIPANT_NOT_FOUND";
export const WALLET_CURRENCY_NOT_FOUND = "WALLET_CURRENCY_NOT_FOUND";
export const KYC_NOT_FOUND = "KYC_NOT_FOUND";
export const VERIFICATION_NOT_FOUND = "VERIFICATION_NOT_FOUND";
export const INVALID_USER_COMPANY = "INVALID_USER_COMPANY";
export const CAMPAIGN_CLOSED = "CAMPAIGN_CLOSED";
export const SOICIAL_LINKING_ERROR = "SOICIAL_LINKING_ERROR";
export const POST_ID_NOT_FOUND = "POST_ID_NOT_FOUND";
export const SOCIAL_LINK_NOT_FOUND = "SOCIAL_LINK_NOT_FOUND";
export const PROFILE_NOT_FOUND = "PROFILE_NOT_FOUND";
export const NOTIFICATION_SETTING_NOT_FOUND = "NOTIFICATION_SETTING_NOT_FOUND";
export const GLOBAL_WITHDRAW_LIMIT = "GLOBAL_WITHDRAW_LIMIT";
export const ALREADY_PARTICIPATING = "ALREADY_PARTICIPATING";
export const MEDIA_NOT_FOUND = "MEDIA_NOT_FOUND";
export const TWITTER_LINK_EXPIRED = "TWITTER_LINK_EXPIRED";
export const ACCOUNT_RESTRICTED = "ACCOUNT_RESTRICTED";
export const SERVICE_NOT_AVAILABLE = "SERVICE_NOT_AVAILABLE";

export const errorMap: { [key: string]: string } = {
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
    ERROR_LINKING_TWITTER: "You need to link your twitter account before you redeem!",
    GLOBAL_CAMPAIGN_NOT_FOUND: "Global campaign doesn't exists.",
    VERIFICATION_TOKEN_EXPIRED: "Verification token expired.",
    ORG_NOT_FOUND: "Organization not found.",
    ERROR_CALCULATING_TIER: "Failure calculating current tier.",
    GLOBAL_CAMPAIGN_EXIST_FOR_CURRENCY: "A global campaign already exists for this currency.",
    ALREADY_PARTICIPATING: "User already participating in this campaign.",
    RAFFLE_PRIZE_MISSING: "Must specify prize for raffle.",
    COMPANY_NOT_SPECIFIED: "ADministrators need to specify a company in args.",
    CURRENCY_NOT_SUPPORTED: "Currency is not supported.",
    CURRENCY_NOT_FOUND: "Currency not found in wallet.",
    CAMPAIGN_NAME_EXISTS: "A campaign already exists with this name.",
    CAMPAIGN_NOT_FOUND: "Campaign not found.",
    CAMPAIGN_ORGANIZATION_MISSING: "CAMPAIGN_ORGANIZATION_MISSING",
    ADMIN_NOT_FOUND: "ADMIN_NOT_FOUND",
    TRANSFER_NOT_FOUND: "TRANSFER_NOT_FOUND",
    ESCROW_NOT_FOUND: "ESCROW_NOT_FOUND",
    WALLET_NOT_FOUND: "WALLET_NOT_FOUND",
    AMOUNT_IN_POSITIVE: "Amount must be a positive number",
    PARTICIPANT_NOT_FOUND: "PARTICIPANT_NOT_FOUND",
    WALLET_CURRENCY_NOT_FOUND: "WALLET_CURRENCY_NOT_FOUND",
    KYC_NOT_FOUND: "kyc data not found for user",
    VERIFICATION_NOT_FOUND: "verification application not found",
    INVALID_USER_COMPANY: "INVALID_USER_COMPANY",
    CAMPAIGN_CLOSED: "campaign is closed",
    SOICIAL_LINKING_ERROR: "no client for this social link type",
    POST_ID_NOT_FOUND: "POST_ID_NOT_FOUND",
    SOCIAL_LINK_NOT_FOUND: "SOCIAL_LINK_NOT_FOUND",
    PROFILE_NOT_FOUND: "PROFILE_NOT_FOUND",
    NOTIFICATION_SETTING_NOT_FOUND: "NOTIFICATION_SETTING_NOT_FOUND",
    GLOBAL_WITHDRAW_LIMIT: `Withdraw limit reached! Withdraws above $${WITHDRAW_LIMIT} are restricted. Please contact our support for further assistance.`,
    MEDIA_NOT_FOUND: "Media not found.",
    TWITTER_LINK_EXPIRED: "Access token expired for twitter, please link your twitter again.",
    ACCOUNT_RESTRICTED: "User account has been restricted. Please contact our support for further assistance.",
    SERVICE_NOT_AVAILABLE: "Store redemption is not available is your country.",
};
