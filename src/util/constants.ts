export const FEE_RATE = process.env.FEE_RATE ? parseFloat(process.env.FEE_RATE) : 0.1;
export const COIIN = "COIIN";
export const MATIC = "MATIC";
export const BSC = "BSC";
export const ETH = "ETH";
export const BNB = "BNB";
export const ADA = "ADA";
export const BADA = "BADA";
export const BBNB = "BBNB";
export const DOGE = "DOGE";
export const BTC = "BTC";
export const BCH_DEFAULT_WITHDRAW_FEE = 0.001;
export const BNB_DEFAULT_WITHDRAW_FEE = 0.0005;
export const XRP_DEFAULT_WITHDRAW_FEE = 0.1;
export const DOGE_DEFAULT_WITHDRAW_FEE = 5;
export const LTC_DEFAULT_WITHDRAW_FEE = 0.001;
export const XLM_DEFAULT_WITHDRAW_FEE = 0.01;
export const NETWORK_TO_NATIVE_TOKEN: { [key: string]: string } = {
    BSC: BNB,
    ETH: ETH,
    MATIC: MATIC,
};
export const TOKEN_TO_WITHDRAW_ENDPOINT: { [key: string]: string } = {
    BTC: "/offchain/bitcoin/transfer",
    LTC: "/offchain/litecoin/transfer",
    BCH: "/offchain/bcash/transfer",
    DOGE: "/offchain/dogecoin/transfer",
    BNB: "/offchain/bnb/transfer",
    FLOW: "/offchain/flow/transfer",
};
export const COIIN_ALERT_TRIGGER_LIMIT = 5000;
export const CUSTODIAL_NETWORKS = [MATIC, ETH, BSC];
export const WITHDRAW_LIMIT = 1000;
export const SHARING_REWARD_LIMIT_PER_DAY = 5;
export const RAIINMAKER_ORG_NAME = "raiinmaker";
export const AMOUNT_LIMIT_FOR_KYC_IN_XOXODAY = 100;

export const CRYPTO_ICONS_BUCKET_URL = "https://rm-crypto-icons.s3.us-west-2.amazonaws.com";
export const CRYPTO_ICONS_MAP: { [key: string]: string } = {
    COIIN: "coiin.png",
    ADA: "ada-icon.png",
    BAT: "bat-icon.png",
    MATIC: "matic-icon.png",
    BCH: "bch-icon.png",
    BNB: "bnb-icon.png",
    BSC: "bnb-icon.png",
    BTC: "btc-icon.png",
    BUSD: "busd-icon.png",
    CAKE: "cake-icon.png",
    CELO: "celo-icon.png",
    DOGE: "doge-icon.png",
    EGLD: "egld-icon.png",
    ETH: "eth-icon.png",
    FLOW: "flow-icon.png",
    LINK: "link-icon.png",
    LTC: "ltc-icon.png",
    MKR: "mkr-icon.png",
    NEO: "neo-icon.png",
    ONE: "one-icon.png",
    PAXG: "paxg-icon.png",
    QTUM: "qtum-icon.png",
    TRX: "trx-icon.png",
    TUSD: "tusd-icon.png",
    UNI: "uni-icon.png",
    USDC: "usdc-icon.png",
    USDT: "usdt-icon.png",
    VET: "vet-icon.png",
    WBTC: "wbtc-icon.png",
    XRP: "xrp-icon.png",
    XLM: "xlm-icon.png",
};
export const LOGIN_REWARD_AMOUNT = 1;
export const PARTICIPATION_REWARD_AMOUNT = 2;
export const REGISTRATION_REWARD_AMOUNT = 15;
export const SHARING_REWARD_AMOUNT = 1;
export const WEEK_LIMIT_USD_ONE_MONTH_OLD_ACCOUNT = 25;
export const WEEK_LIMIT_USD_TWO_MONTH_OLD_ACCOUNT = 50;
export const WEEK_LIMIT_USD_THREE_MONTH_OLD_ACCOUNT = 75;
export const WEEK_LIMIT_USD_FOUR_MONTH_OLD_ACCOUNT = 100;
export const REWARD_AMOUNTS: { [key: string]: number } = {
    LOGIN_REWARD: LOGIN_REWARD_AMOUNT,
    PARTICIPATION_REWARD: PARTICIPATION_REWARD_AMOUNT,
    REGISTRATION_REWARD: REGISTRATION_REWARD_AMOUNT,
    SHARING_REWARD: SHARING_REWARD_AMOUNT,
};
export const KYC_APPROVAL_MESSAGE_TITLE = "Your KYC application has been APPROVED!";
export const KYC_PENDING_MESSAGE_TITLE = "Your KYC application has been SUBMITTED!";
export const KYC_REJECTED_MESSAGE_TITLE = "Your KYC Application has been REJECTED!";
export const KYC_APPROVAL_MESSAGE_BODY = "You are now eligible for full functionality within Raiinmaker.";
export const KYC_PENDING_MESSAGE_BODY = "We will update you once application's status changes.";
export const KYC_REJECTED_MESSAGE_BODY =
    "Please contact our support to find out reason. You will have to re-apply for KYC with more precise details.";

export const TRANSACTION_WITHDRAW_MESSAGE_TITLE = "Withdraw Request Completed!";
export const TRANSACTION_DEPOST_MESSAGE_TITLE = "Deposit Received!";
export const TRANSACTION_WITHDRAW_MESSAGE_BODY = "You request to withdraw funds has been initiated.";
export const TRANSACTION_DEPOSIT_MESSAGE_BODY = "You have successfully deposited funds in your raiinmaker wallet.";

export const KYC_NOTIFICATION_TITLE: { [key: string]: string } = {
    APPROVED: KYC_APPROVAL_MESSAGE_TITLE,
    PENDING: KYC_PENDING_MESSAGE_TITLE,
    REJECTED: KYC_REJECTED_MESSAGE_TITLE,
};

export const KYC_NOTIFICATION_BODY: { [key: string]: string } = {
    APPROVED: KYC_APPROVAL_MESSAGE_BODY,
    PENDING: KYC_PENDING_MESSAGE_BODY,
    REJECTED: KYC_REJECTED_MESSAGE_BODY,
};

export const TRANSACTION_NOTIFICATION_TITLE: { [key: string]: string } = {
    WITHDRAW: TRANSACTION_WITHDRAW_MESSAGE_TITLE,
    DEPOSIT: TRANSACTION_DEPOST_MESSAGE_TITLE,
};

export const TRANSACTION_NOTIFICATION_BODY: { [key: string]: string } = {
    WITHDRAW: TRANSACTION_WITHDRAW_MESSAGE_BODY,
    DEPOSIT: TRANSACTION_DEPOSIT_MESSAGE_BODY,
};

export enum CampaignStatus {
    ACTIVE = "ACTIVE",
    PENDING = "PENDING",
    INSUFFICIENT_FUNDS = "INSUFFICIENT_FUNDS",
    CLOSED = "CLOSED",
    APPROVED = "APPROVED",
    DENIED = "DENIED",
}

export enum CampaignAuditStatus {
    DEFAULT = "DEFAULT",
    PENDING = "PENDING",
    AUDITED = "AUDITED",
}

export enum CampaignState {
    ALL = "ALL",
    OPEN = "OPEN",
    CLOSED = "CLOSED",
}

export enum SocialClientType {
    FACEBOOK = "facebook",
    TWITTER = "twitter",
    TIKTOK = "tiktok",
}

export enum TransferAction {
    TRANSFER = "TRANSFER",
    WITHDRAW = "WITHDRAW",
    DEPOSIT = "DEPOSIT",
    FEE = "FEE",
    PRIZE = "PRIZE",
    REFUND = "REFUND",
    LOGIN_REWARD = "LOGIN_REWARD",
    REGISTRATION_REWARD = "REGISTRATION_REWARD",
    PARTICIPATION_REWARD = "PARTICIPATION_REWARD",
    SHARING_REWARD = "SHARING_REWARD",
    CAMPAIGN_REWARD = "CAMPAIGN_REWARD",
    NETWORK_REWARD = "NETWORK_REWARD",
    XOXODAY_REDEMPTION = "XOXODAY_REDEMPTION",
}

export enum TransferStatus {
    BLOCKED = "BLOCKED",
    CANCELED = "CANCELED",
    DENIED = "DENIED",
    FAILED = "FAILED",
    HELD = "HELD",
    REFUNDED = "REFUNDED",
    RETURNED = "RETURNED",
    SUCCEEDED = "SUCCEEDED",
    UNCLAIMED = "UNCLAIMED",
    PENDING = "PENDING",
    APPROVED = "APPROVED",
    REJECTED = "REJECTED",
}

export enum TransferType {
    CREDIT = "CREDIT",
    DEBIT = "DEBIT",
}

export enum CoiinTransferAction {
    ADD = "ADD",
    REMOVE = "REMOVE",
}

export enum CacheKeys {
    CAMPAIGN_RESET_KEY = "CAMPAIGN-",
    USER_RESET_KEY = "USER-",
    WALLET_RESET_KEY = "WALLET-",
    MARKET_DATA_RESET_KEY = "MARKET-DATA",
    CAMPAIGN_BY_STATUS_SERVICE = "CAMPAIGN-BY-STATUS",
    CAMPAIGN_BY_ID_SERVICE = "CAMPAIGN-BY-ID",
    CAMPAIGN_BY_NAME_SERVICE = "CAMPAIGN-BY-NAME",
    CAMPAIGN_BY_ORG_SERVICE = "CAMPAIGN-BY-ORG",
    CAMPAIGN_GLOBAL_SERVICE = "CAMPAIGN-GLOBAL",
    CAMPAIGN_TIER_SERVICE = "CAMPAIGN-TIER",
    MARKET_DATA_SERVICE = "MARKET-DATA",
    USER_BY_ID_SERVICE = "USER-BY-ID",
    USER_COIIN_ADDRESS_SERVICE = "USER-COIIN-ADDRESS",
    USER_PENDING_TRANSFERS = "USER-PENDING-TRANSFERS",
    WALLET_BY_ID_SERVICE = "WALLET-BY-ID",
    WALLET_BY_ORG_SERVICE = "WALLET-BY-ORG",
    WALLET_BY_USER_SERVICE = "WALLET-BY-USER",
}

export enum VerificationType {
    EMAIL = "EMAIL",
    PASSWORD = "PASSWORD",
    WITHDRAW = "WITHDRAW",
}

export const USD = "USD";

export enum SharingRewardType {
    COIIN = "COIIN",
    INFLUENCE = "INFLUENCE",
}
