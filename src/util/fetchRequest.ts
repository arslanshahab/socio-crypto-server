import fetch from "node-fetch";
import { URLSearchParams } from "url";

export interface RequestData {
    url: string;
    method: "POST" | "GET" | "PUT" | "DELETE";
    payload?: any;
    query?: any;
    headers?: any;
}

export const doFetch = async (requestData: RequestData) => {
    let options = {
        method: requestData.method,
        headers: {
            "Content-Type": "application/json",
            ...(requestData.headers && requestData.headers),
        },
    };
    let url = requestData.url;
    if (requestData.query) {
        url = `${requestData.url}?${new URLSearchParams(requestData.query)}`;
    }
    if (requestData.method !== "GET") {
        options = { ...options, ...(requestData.payload && { body: JSON.stringify(requestData.payload) }) };
    }
    return fetch(url, options);
};
