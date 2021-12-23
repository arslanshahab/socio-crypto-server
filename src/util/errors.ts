import { ApolloError } from "apollo-server-express";

export class FailureByDesign extends Error {
    public code: string;
    public message: string;

    public constructor(code: string, message: any) {
        super(message);
        this.code = code || "FAILURE_BY_DESIGN";
        this.message = message || "";
    }
}

interface ErrorObject {
    code: string;
    message: string;
}

const errorCodes: { [key: string]: ErrorObject } = {
    0: { code: "500", message: "Something went wrong your request. please try again!" },
    1: { code: "400", message: "Missing required parameters." },
    2: { code: "401", message: "A user has already registered with this email." },
    3: { code: "401", message: "Provided email isn't verfied by our system." },
    4: { code: "401", message: "Provided email doesn't exist in our records." },
    5: { code: "401", message: "Password is not correct, please try again." },
    6: { code: "401", message: "No user found against provided parameters." },
    7: { code: "401", message: "Provided username doesn't exist in our records." },
    8: { code: "401", message: "Provided code is not correct." },
    9: { code: "401", message: "A user has already registered with this username." },
};

export class FormattedError extends ApolloError {
    public code: string;
    public message: string;

    public constructor(error: any) {
        let code = "0";
        if (error.message && error.message.includes("ERROR")) code = error.message.split(":")[1];
        if (!error.message || !error.message.includes("ERROR")) console.log(error);
        let errorData = errorCodes[code] || errorCodes["0"];
        super(errorData.message, errorData.code);
        this.code = errorData.code;
        this.message = errorData.message;
    }
}
