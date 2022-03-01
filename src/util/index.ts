import { CryptoCurrency } from "../models/CryptoCurrency";
import { TatumClient } from "../clients/tatumClient";
import { getExchangeRateForCrypto } from "./exchangeRate";
// eslint-disable-next-line
// @ts-ignore
import getImage from "cryptoicons-cdn";
import { AcuantClient, AcuantApplication, Etr } from "../clients/acuant";
import {
    AcuantApplicationExtractedDetails,
    JWTPayload,
    KycStatus,
    SupportedCountryType,
    KycUser,
    FactorGeneration,
} from "src/types";
import { VerificationApplication } from "../models/VerificationApplication";
import { S3Client } from "../clients/s3";
import { User } from "../models/User";
import crypto from "crypto";
import { Secrets } from "./secrets";
import jwt from "jsonwebtoken";
import fetch from "node-fetch";
import { serverBaseUrl } from "../config";
import { Request, Response, NextFunction } from "express";
import { BigNumber } from "bignumber.js";
import { Factor } from "../models/Factor";
import { CRYPTO_ICONS_MAP, CRYPTO_ICONS_BUCKET_URL } from "./constants";

// general helper functions start here
export const isSupportedCurrency = async (symbol: string): Promise<boolean> => {
    const crypto = await CryptoCurrency.findOne({ where: { type: symbol.toLowerCase() } });
    if (crypto) return true;
    return await TatumClient.isCurrencySupported(symbol);
};

export const getMinWithdrawableAmount = async (symbol: string) => {
    symbol = symbol.toLowerCase();
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
    const key = CRYPTO_ICONS_MAP[symbol?.toUpperCase() || "ETH"] || CRYPTO_ICONS_MAP["ETH"];
    return `${CRYPTO_ICONS_BUCKET_URL}/${key}`;
};

export const downloadMedia = async (mediaType: string, url: string, format: string): Promise<string> => {
    return await fetch(url)
        .then((r) => r.buffer())
        .then((buf) =>
            mediaType === "photo" ? buf.toString("base64") : `data:${format};base64,` + buf.toString("base64")
        );
};

export const formatFloat = (val?: string | number | null): string => {
    if (!val) {
        return "0";
    }
    if (typeof val === "string") {
        val = parseFloat(val);
    }
    return val >= 1 ? val.toFixed(2) : val.toFixed(8);
};

export const getBase64FileExtension = (fileString: string) => {
    if (fileString === "") throw new Error("invalid fileString uploaded");
    return fileString.split(":")[1].split(";")[0];
};

export const asyncHandler = (fn: any) => (req: Request, res: Response, next: NextFunction) => {
    return Promise.resolve(fn(req, res, next)).catch(next);
};

export const extractFactor = (factor: string): string => {
    try {
        const result = JSON.parse(factor);
        const keys = Object.keys(result);
        if (keys.length > 1 || keys.length === 0) throw new Error("factor must be an object with a single key");
        return result[keys[0]];
    } catch (_) {
        // if it is failing to parse, factor is most likely just the string value
        return factor;
    }
};

export const generateRandomNumber = (max = 9000000) => Math.floor(Math.random() * max);

export const BN = BigNumber.clone({
    EXPONENTIAL_AT: [-1e9, 1e9],
});

if (process.env.NODE_ENV !== "script") {
    BN.prototype.valueOf = function () {
        throw Error("Conversion to primitive type is prohibited");
    };
}

// pinning value of coiin at 10 cents
export const USD_PER_COIIN = new BN(0.1);

export const deleteFactorFromKycData = (kycData: KycUser, factorName: string) => {
    switch (factorName) {
        case "MyFii-Verified-FirstName":
            delete (kycData as any).firstName;
            break;
        case "MyFii-Verified-LastName":
            delete (kycData as any).lastName;
            break;
        case "MyFii-Verified-Name":
            delete (kycData as any).firstName;
            delete (kycData as any).lastName;
            break;
        case "MyFii-Verified-Address":
            if (kycData.address) {
                delete (kycData as any).address.address1;
                delete (kycData as any).address.address2;
                delete (kycData as any).address.city;
                delete (kycData as any).address.state;
                delete (kycData as any).address.country;
                delete (kycData as any).address.zip;
            }
            break;
        case "MyFii-Verified-City":
            if (kycData.address) delete (kycData as any).address.city;
            break;
        case "MyFii-Verified-State":
            if (kycData.address) delete (kycData as any).address.state;
            break;
        case "MyFii-Verified-Country":
            if (kycData.address) delete (kycData as any).address.country;
            break;
        case "MyFii-Verified-Phone":
            delete (kycData as any).phoneNumber;
            break;
    }
    return kycData;
};

export const createFactorsFromKycData = (kycData: KycUser, factorCreateRequests: FactorGeneration[] = []) => {
    const factors: { [key: string]: Factor } = {};
    for (let i = 0; i < factorCreateRequests.length; i++) {
        const factorRequest = factorCreateRequests[i];
        let factorData, factor, factorName;
        switch (factorRequest.name) {
            case "fullName":
                factorData = `${kycData.firstName} ${kycData.lastName}`;
                factorName = "MyFii-Verified-Name";
                break;
            case "firstName":
                factorData = kycData.firstName;
                factorName = "MyFii-Verified-FirstName";
                break;
            case "lastName":
                factorData = kycData.lastName;
                factorName = "MyFii-Verified-LastName";
                break;
            case "address":
                factorData = kycData.address.address1;
                if (kycData.address.address2) factorData += ` ${kycData.address.address2}`;
                factorData += ` ${kycData.address.city} ${kycData.address.state} ${kycData.address.country} ${kycData.address.zip}`;
                factorName = "MyFii-Verified-Address";
                break;
            case "city":
                factorData = kycData.address.city;
                factorName = "MyFii-Verified-City";
                break;
            case "state":
                factorData = kycData.address.state;
                factorName = "MyFii-Verified-State";
                break;
            case "country":
                factorData = kycData.address.country;
                factorName = "MyFii-Verified-Country";
                break;
            case "phone":
                factorData = kycData.phoneNumber;
                factorName = "MyFii-Verified-Phone";
                break;
        }
        if (factorData && factorName) {
            factor = new Factor({ id: factorRequest.id, name: factorName, factor: factorData });
            factor.sign();
            factors[factorRequest.name] = factor;
        }
    }
    return factors;
};

export const generateRandomNonce = () => {
    const characters = "0123456789";
    const length = 6;
    let result = "";
    for (let i = length; i > 0; i--) result += characters[Math.floor(Math.random() * characters.length)];
    return result;
};

export const paginateList = (items: any[], maxItems = 100) => {
    const pages = [];
    let idx = 0;
    while (idx < items.length) {
        var nextIndex = idx + maxItems < items.length ? idx + maxItems : items.length;
        pages.push(items.slice(idx, nextIndex));
        idx += maxItems;
    }
    return pages;
};

export const calculateQualityMultiplier = (tier: BigNumber) => {
    const tierValue = (value: number) => new BN(value);
    switch (tier) {
        case tierValue(1):
            return new BN(0.625);
        case tierValue(2):
            return new BN(1);
        case tierValue(3):
            return new BN(1.25);
        case tierValue(4):
            return new BN(2.5);
        default:
            return new BN(1);
    }
};

export const getDecimal = (str: string) => {
    if (str.length <= 18) {
        return `0.${str.padStart(18, "0")}`;
    }
    const pos = str.length - 18;
    return [str.slice(0, pos), str.slice(pos)].join(".");
};

export const generateRandomId = () => {
    const possible = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
    const stringLength = 20;
    function pickRandom() {
        return possible[Math.floor(Math.random() * possible.length)];
    }
    return Array.apply(null, Array(stringLength)).map(pickRandom).join("");
};

export const supportedCountries = (): Array<SupportedCountryType> => {
    return [
        { name: "Austria", currency: "EUR", enabled: true, filterValue: "austria" },
        { name: "Canada", currency: "CAD", enabled: true, filterValue: "canada" },
        { name: "France", currency: "EUR", enabled: true, filterValue: "france" },
        { name: "Germany", currency: "EUR", enabled: true, filterValue: "germany" },
        { name: "India", currency: "INR", enabled: true, filterValue: "india" },
        { name: "Ireland", currency: "GBP", enabled: true, filterValue: "ireland" },
        { name: "Italy", currency: "EUR", enabled: true, filterValue: "italy" },
        { name: "Japan", currency: "JPY", enabled: true, filterValue: "japan" },
        { name: "Luxembourg", currency: "EUR", enabled: true, filterValue: "luxembourg" },
        { name: "Mexico", currency: "MXN", enabled: true, filterValue: "mexico" },
        { name: "Netherlands", currency: "EUR", enabled: true, filterValue: "netherlands" },
        { name: "Poland", currency: "EUR", enabled: true, filterValue: "poland" },
        { name: "Singapore", currency: "SGD", enabled: true, filterValue: "singapore" },
        { name: "Spain", currency: "EUR", enabled: true, filterValue: "spain" },
        { name: "Sweden", currency: "SEK", enabled: true, filterValue: "sweden" },
        { name: "Switzerland", currency: "EUR", enabled: true, filterValue: "switzerland" },
        { name: "United Kingdom", currency: "GBP", enabled: true, filterValue: "uk" },
        { name: "United States", currency: "USD", enabled: true, filterValue: "usa" },
        { name: "Morocco", currency: "MAD", enabled: true, filterValue: "morocco" },
        { name: "Saudi Arabia", currency: "SAR", enabled: true, filterValue: "saudi_arabia" },
        { name: "United Arab, Emirates", currency: "AED", enabled: true, filterValue: "uae" },
    ];
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
    };
    return jwt.sign(payload, Secrets.encryptionKey, { expiresIn: "7d", audience: serverBaseUrl });
};

export const verifySessionToken = (token: string): JWTPayload => {
    return jwt.verify(token, Secrets.encryptionKey, { audience: serverBaseUrl }) as JWTPayload;
};
// authentication helpers end here
