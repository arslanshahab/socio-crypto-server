import fetch from "node-fetch";

export interface RequestData {
    url: string;
    authToken?: string;
    xAPIToken?: string;
    method: "POST" | "GET" | "PUT" | "DELETE";
    payload?: any;
    query?: any;
}

export const doFetch = async (requestData: RequestData) => {
    let options = {
        method: requestData.method,
        headers: {
            "Content-Type": "application/json",
            ...(requestData.authToken && { Authorization: "Bearer " + requestData.authToken }),
            ...(requestData.xAPIToken && { "x-api-key": requestData.xAPIToken }),
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
