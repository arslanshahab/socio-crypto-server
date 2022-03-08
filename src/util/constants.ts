export const FEE_RATE = process.env.FEE_RATE ? parseFloat(process.env.FEE_RATE) : 0.1;
export const COIIN = "COIIN";
export const MATIC = "MATIC";
export const RAIINMAKER_ORG_NAME = "raiinmaker";
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
export const REWARD_AMOUNTS: { [key: string]: number } = {
    LOGIN_REWARD: LOGIN_REWARD_AMOUNT,
    PARTICIPATION_REWARD: PARTICIPATION_REWARD_AMOUNT,
    REGISTRATION_REWARD: REGISTRATION_REWARD_AMOUNT,
    SHARING_REWARD: SHARING_REWARD_AMOUNT,
};
