import { URLSearchParams } from "url";
import axios, { AxiosRequestConfig, Method } from "axios";

export interface RequestData {
    url: string;
    method: Method;
    payload?: any;
    query?: any;
    headers?: any;
}

export const doFetch = async (requestData: RequestData) => {
    try {
        let options: AxiosRequestConfig = {
            url: requestData.query ? `${requestData.url}?${new URLSearchParams(requestData.query)}` : requestData.url,
            method: requestData.method,
            headers: {
                ...(requestData.payload && { "Content-Type": "application/json" }),
                ...(requestData.headers && requestData.headers),
            },
            ...(requestData.method !== "GET" && requestData.payload && { data: requestData.payload }),
        };
        return (await axios(options)).data;
    } catch (error) {
        if (error?.response?.data) {
            console.log("Error code ---- ", error?.response?.status || "");
            console.log("Error Data ---- ", error?.response?.data || "");
        } else {
            console.log("Error ---- ", error);
        }
        throw new Error("There was an error making request");
    }
};
