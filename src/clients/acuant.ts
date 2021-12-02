import fetch, { RequestInit } from "node-fetch";
import { Secrets } from "../util/secrets";
const { NODE_ENV = "staging" } = process.env;

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
    public static url: string =
        NODE_ENV === "production" ? "https://identitymind.com" : "https://staging.identitymind.com";
    private static authorization: string;

    public static initialize() {
        AcuantClient.authorization = `Basic ${Buffer.from(
            `${Secrets.acuantApiUser}:${Secrets.acuantApiKey}`,
            "utf8"
        ).toString("base64")}`;
    }

    public static getOptions(method: string, body?: any): RequestInit {
        const options: RequestInit = {
            method,
            headers: {
                "Content-Type": "application/json",
                authorization: AcuantClient.authorization,
            },
        };
        console.log(JSON.stringify(options));
        if (body) options.body = JSON.stringify(body);
        return options;
    }

    public static async submitApplication(vars: any): Promise<string> {
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
        if (["DL"].includes(vars.documentType)) body.backsideImageData = vars.backDocumentImage;
        validateImageSizeInMB("frontDocumentImage", body.scanData);
        validateImageSizeInMB("selfie", body.faceImages[0]);
        if (body.backsideImageData) validateImageSizeInMB("backDocumentImage", body.backsideImageData);
        return (await AcuantClient.post("im/account/consumer", body)).mtid;
    }

    public static async getApplication(id: string): Promise<AcuantApplication> {
        return await this.get(`im/account/consumer/${id}`);
    }

    private static async get(path: string) {
        const options = AcuantClient.getOptions("GET");
        return await AcuantClient.makeRequest(path, options);
    }

    private static async post(path: string, body: any) {
        const options = AcuantClient.getOptions("POST", body);
        return await AcuantClient.makeRequest(path, options);
    }

    public static async makeRequest(path: string, options: RequestInit) {
        console.log(`Acuant ${options.method} -> ${AcuantClient.url}${path}`);
        const res = await fetch(`${AcuantClient.url}/${path}`, options);
        const responseText = await res.text();
        const statusCode = res.status;
        console.log(`Acuant ${options.method} <- [${statusCode}] ${responseText}`);
        if (!res.ok) {
            let parsedResponseText;
            try {
                parsedResponseText = JSON.parse(responseText);
            } catch (e) {
                throw new Error(responseText);
            }
            const { error } = parsedResponseText;
            throw new Error(error || "acuant service returned a non 2xx response");
        }
        try {
            return JSON.parse(responseText);
        } catch (e) {
            return responseText;
        }
    }
}
