import fetch, { RequestInfo } from "node-fetch";

export const doFetch = async (url: RequestInfo, method: string, payload: any) => {
    let options = {
        body: {},
        method: method,
        headers: {
            "Content-Type": "application/json",
        },
    };
    if (method === "GET") {
        url = `${url}?${new URLSearchParams(payload.query)}`;
    } else {
        options.body = JSON.stringify(payload);
    }
    // @ts-ignore
    return fetch(url, options);
};
