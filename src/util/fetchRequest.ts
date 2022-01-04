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
                "Content-Type": "application/json",
                ...(requestData.headers && requestData.headers),
            },
            data: requestData.method !== "GET" && requestData.payload ? requestData.payload : null,
        };
        const resp = await axios(options);
        return resp.data;
    } catch (error) {
        console.log(error.response.data);
        throw new Error("There was an error making request");
    }
};
