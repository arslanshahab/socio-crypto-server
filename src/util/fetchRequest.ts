import fetch, { RequestInfo } from "node-fetch";

export const doFetch = async (url: RequestInfo, token: any, method: string, payload: any) => {
    let options = {
        method: method,
        headers: {
            "Content-Type": "application/json",
            ...(token && { Authorization: "Bearer " + token }),
        },
    };
    if (method === "GET") {
        url = payload.query ? `${url}?${new URLSearchParams(payload.query)}` : url;
    } else {
        // @ts-ignore
        options = { ...options, body: JSON.stringify(payload) };
    }
    // @ts-ignore
    return fetch(url, options);
};
