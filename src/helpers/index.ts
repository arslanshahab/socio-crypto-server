import { CryptoCurrency } from "../models/CryptoCurrency";
import { TatumClient } from "../clients/tatumClient";
import { Currency } from "../models/Currency";
import { getExchangeRateForCrypto } from "../util/exchangeRate";
// eslint-disable-next-line
// @ts-ignore
import getImage from "cryptoicons-cdn";
import { Wallet } from "../models/Wallet";
import { AcuantClient, AcuantApplication, Etr } from "../clients/acuant";
import { AcuantApplicationExtractedDetails, JWTPayload, KycStatus } from "src/types";
import { VerificationApplication } from "../models/VerificationApplication";
import { S3Client } from "../clients/s3";
import { User } from "../models/User";
import crypto from "crypto";
import { Secrets } from "../util/secrets";
import jwt from "jsonwebtoken";
import { serverBaseUrl } from "../config";

// general helper functions start here
export const isSupportedCurrency = async (symbol: string): Promise<boolean> => {
    const crypto = await CryptoCurrency.findOne({ where: { type: symbol.toLowerCase() } });
    if (crypto) return true;
    return await TatumClient.isCurrencySupported(symbol);
};

export const findOrCreateCurrency = async (symbol: string, wallet: Wallet): Promise<Currency> => {
    try {
        let ledgerAccount = await Currency.findOne({ where: { wallet, symbol } });
        if (!ledgerAccount) {
            const newLedgerAccount = await TatumClient.createLedgerAccount(symbol);
            const newDepositAddress = await TatumClient.generateDepositAddress(newLedgerAccount.id);
            ledgerAccount = await Currency.addAccount({
                ...newLedgerAccount,
                ...newDepositAddress,
                wallet,
            });
        }
        return ledgerAccount;
    } catch (error) {
        console.log(error);
        throw new Error(error.message);
    }
};

export const getWithdrawableAmount = (amount: number): string => {
    return (amount * 0.95).toFixed(8);
};

export const getMinWithdrawableAmount = async (symbol: string) => {
    const minLimit = process.env.MIN_WITHDRAW_LIMIT ? parseFloat(process.env.MIN_WITHDRAW_LIMIT) : 250;
    const marketRate = await getExchangeRateForCrypto(symbol);
    return (1 / marketRate) * minLimit;
};

export const getUSDValueForCurrency = async (symbol: string, amount: number) => {
    if (symbol.toLowerCase() === "coiin") {
        return parseFloat(process.env.COIIN_VALUE || "0") * amount;
    }
    const marketRate = await getExchangeRateForCrypto(symbol);
    return marketRate * amount;
};

export const getCryptoAssestImageUrl = (symbol: string): string => {
    return getImage(symbol).toLowerCase().includes("unknown") ? getImage("ETH") : getImage(symbol);
};
//general helper functions end here

// KYC helpers start here
const generateAgeFactor = (dobEtr: Etr) => {
    if (!dobEtr || dobEtr.test !== "dv:15") return null;
    const dob = new Date(dobEtr.details.toString());
    const today = new Date();
    let age = today.getFullYear() - dob.getFullYear();
    const m = today.getMonth() - dob.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < dob.getDate())) age--;
    return age;
};

const generateNameFactor = (nameEtr: Etr) => {
    if (!nameEtr || nameEtr.test !== "dv:13") null;
    return nameEtr.details;
};

const generateDocumentValidityFactor = (docValidityEtr: Etr, docExpirationEtr: Etr, docTypeEtr: Etr) => {
    if (!docExpirationEtr || docExpirationEtr.test !== "dv:17") return;
    if (!docValidityEtr || docValidityEtr.test !== "dv:11") return;
    if (!docTypeEtr || docTypeEtr.test !== "dv:19") return;
    if (docValidityEtr.details !== "false") return;
    return {
        isDocumentValid: true,
        documentDetails: docTypeEtr.details,
        documentExpiry: new Date(docExpirationEtr.details),
    };
};

const generateAddressFactor = (addressEtr: Etr) => {
    if (!addressEtr || addressEtr.test !== "dv:14") return null;
    return addressEtr.details;
};

export const generateFactorsFromKYC = (kycDocument: any): AcuantApplicationExtractedDetails => {
    let resultingFactors: AcuantApplicationExtractedDetails = {
        age: 0,
        fullName: "",
        address: "",
        isDocumentValid: false,
        documentDetails: "",
        documentExpiry: null,
    };
    const validData = kycDocument.ednaScoreCard.etr.reduce((accum: { [key: string]: Etr }, current: any) => {
        if (!current["condition"]) {
            accum[current["test"]] = current;
        }
        return accum;
    }, {});
    resultingFactors.age = generateAgeFactor(validData["dv:15"]);
    resultingFactors.fullName = generateNameFactor(validData["dv:13"]);

    const doc = generateDocumentValidityFactor(validData["dv:11"], validData["dv:17"], validData["dv:19"]);
    if (doc) {
        resultingFactors = { ...resultingFactors, ...doc };
    }

    resultingFactors.address = generateAddressFactor(validData["dv:14"]);
    return resultingFactors;
};

export const getApplicationStatus = (kycApplication: AcuantApplication): KycStatus => {
    const statusCode = kycApplication.state;
    if (statusCode === "A") {
        return "APPROVED";
    } else if (statusCode === "R") {
        return "PENDING";
    } else if (statusCode === "D") {
        return "REJECTED";
    } else {
        return "PENDING";
    }
};

export const findKycApplication = async (user: User) => {
    const recordedApplication = await VerificationApplication.findOne({ where: { user } });
    if (!recordedApplication) return null;
    let kycApplication;
    if (recordedApplication.status === "APPROVED") {
        kycApplication = await S3Client.getAcuantKyc(user.id);
        const factors = generateFactorsFromKYC(kycApplication);
        return { kycId: recordedApplication.applicationId, status: recordedApplication.status, factors: factors };
    }
    if (recordedApplication.status === "PENDING") {
        kycApplication = await AcuantClient.getApplication(recordedApplication.applicationId);
        const status = getApplicationStatus(kycApplication);
        if (status === "APPROVED") {
            await S3Client.uploadAcuantKyc(user.id, kycApplication);
            const factors = generateFactorsFromKYC(kycApplication);
            await recordedApplication.updateStatus(status);
            await user.updateKycStatus(status);
            return { kycId: recordedApplication.applicationId, status: status, factors: factors };
        }
        if (status === "PENDING") return { kycId: recordedApplication.applicationId, status: status };
        if (status === "REJECTED") {
            await VerificationApplication.remove(recordedApplication);
            await user.updateKycStatus("");
            return { kycId: recordedApplication.applicationId, status: status };
        }
    }
    return { kycId: recordedApplication.applicationId, status: recordedApplication.status };
};
// Kyc herlpers end here

// authentication helpers here
export const createPasswordHash = (data: { email: string; password: string }) => {
    const salt = `${data.email.toLowerCase()}-${Secrets.encryptionKey}`;
    return crypto.createHmac("sha512", salt).update(data.password).digest("base64");
};

export const createSessionToken = (user: User): string => {
    const payload: JWTPayload = {
        email: user.email,
        id: user.identityId,
        userId: user.id,
        role: "admin",
        company: "raiinmaker",
    };
    return jwt.sign(payload, Secrets.encryptionKey, { expiresIn: "7d", audience: serverBaseUrl });
};

export const verifySessionToken = (token: string): JWTPayload => {
    return jwt.verify(token, Secrets.encryptionKey, { audience: serverBaseUrl }) as JWTPayload;
};
// authentication helpers end here
