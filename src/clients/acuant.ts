import { Secrets } from "../util/secrets";
import { RequestData, doFetch } from "../util/fetchRequest";
import { KycApplication } from "../types.d";
import { ApolloError } from "apollo-server-express";

const acuantUrls: { [key: string]: string } = {
    // development: "https://sandbox.identitymind.com",
    staging: "https://staging.identitymind.com",
    production: "https://identitymind.com",
};

export interface Etr {
    test: string;
    ts: number;
    stage: string;
    fired: boolean;
    condition?: {
        left: string;
        right: boolean;
        operator: string;
        type: string;
    };
    details: string;
}

export interface AcuantApplication {
    ednaScoreCard: {
        sc: any[];
        etr: Etr[];
        er: {
            profile: string;
            reportedRule: {
                description: string;
                details: string;
                resultCode: string;
                ruleId: number;
                testResults: any[];
                name: string;
            };
        };
    };
    docVerification?: {
        requestId: string;
    };
    mtid: string;
    state: string;
    tid: string;
}

const validateImageSizeInMB = (title: string, img: string, maxSizeMB = 5) => {
    const buffer = Buffer.from(img.substring(img.indexOf(",") + 1), "base64");
    const sizeInMB = buffer.length / 1e6;
    if (sizeInMB > maxSizeMB) throw new Error(`${title} image greater than ${maxSizeMB} MB`);
};

export class AcuantClient {
    public static baseUrl: string =
        process.env.NODE_ENV === "production" ? acuantUrls["production"] : acuantUrls["staging"];

    public static async submitApplication(vars: KycApplication): Promise<AcuantApplication> {
        try {
            const body: { [key: string]: any } = {
                man: `${vars.firstName}-${vars.middleName}-${vars.lastName}`,
                tea: vars.email,
                bfn: vars.firstName,
                bmn: vars.middleName,
                bln: vars.lastName,
                bsn: vars.billingStreetAddress,
                bco: vars.billingCountry,
                bz: vars.billingZip,
                bc: vars.billingCity,
                bgd: vars.gender,
                dob: vars.dob,
                pm: vars.phoneNumber,
                docType: vars.documentType,
                docCountry: vars.documentCountry,
                scanData: vars.frontDocumentImage,
                faceImages: [vars.faceImage],
            };
            if (vars.documentType && ["DL"].includes(vars.documentType))
                body.backsideImageData = vars.backDocumentImage;
            validateImageSizeInMB("frontDocumentImage", body.scanData);
            validateImageSizeInMB("selfie", body.faceImages[0]);
            if (body.backsideImageData) validateImageSizeInMB("backDocumentImage", body.backsideImageData);
            return await this.makeRequest("im/account/consumer", "POST", body);
        } catch (error) {
            throw new ApolloError(error?.message);
        }
    }

    public static async getApplication(id: string): Promise<AcuantApplication> {
        try {
            return await this.makeRequest(`im/account/consumer/v2/${id}`, "GET");
        } catch (error) {
            throw new ApolloError(error?.message);
        }
    }

    private static async makeRequest(
        path: string,
        method: RequestData["method"],
        payload?: RequestData["payload"],
        query?: RequestData["query"]
    ) {
        const url = `${this.baseUrl}/${path}`;
        const requestData: RequestData = {
            method,
            url,
            payload,
            query,
            headers: {
                authorization: `Basic ${Buffer.from(
                    `${Secrets.acuantApiUser}:${Secrets.acuantApiKey}`,
                    "utf8"
                ).toString("base64")}`,
            },
        };
        const response = await doFetch(requestData);
        if (response.status !== 200) {
            const error = await response.json();
            console.log("ACUANT_CLIENT_ERROR", error);
            throw new Error(error?.error_message || "There was an error from acuant");
        }
        return await response.json();
    }
}
