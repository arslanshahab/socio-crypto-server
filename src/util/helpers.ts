import { Request, Response, NextFunction } from "express";
import { BigNumber } from "bignumber.js";
import { FactorGeneration, KycUser } from "../types";
import { Factor } from "../models/Factor";
import { SupportedCountryType } from "../types";

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

// Prevent use in primitive operations.
// See https://mikemcl.github.io/bignumber.js/#type-coercion
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
