import { ApolloError } from "apollo-server-express";

interface ErrorObject {
    code: string;
    message: string;
}

export const throwFormattedError = (error: any) => {
    let code = "0";
    if (error.message && error.message.includes("ERROR")) {
        code = error.message.split(":")[1];
    }
    const errorData = errorCodes[code] || errorCodes["0"];
    throw new ApolloError(errorData.message, errorData.code);
};

const errorCodes: { [key: string]: ErrorObject } = {
    0: { code: "500", message: "Something went wrong, please try again." },
    1: { code: "400", message: "Missing required parameters." },
    2: { code: "401", message: "A user has already registered with this email" },
    3: { code: "401", message: "Provided email isn't verfied by our system." },
    4: { code: "401", message: "Provided email doesn't exist in our records" },
    5: { code: "401", message: "Password is not correct, please try again" },
    6: { code: "401", message: "No user found against provided parameters" },
    7: { code: "401", message: "Provided username doesn't exist in our records" },
    8: { code: "401", message: "Provided code is not correct" },
};
