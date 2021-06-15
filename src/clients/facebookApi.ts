import fetch from "node-fetch";
import querystring, { ParsedUrlQueryInput } from "querystring";
import { GraphApiInputParameters } from "../types";

export class FacebookGraphApi {
    public static url = "https://graph.facebook.com";
    public static version = "v8.0";
    private accessToken: string;

    constructor(accessToken: string) {
        this.accessToken = accessToken;
    }

    public async get(path: string, inputParams: GraphApiInputParameters = {}) {
        const options = { method: "GET" };
        const params: GraphApiInputParameters = { ...inputParams, access_token: this.accessToken };
        // the following line is needed because for some reason, querystring.stringify has issues with string[]
        if (inputParams.fields) params.fields = (inputParams.fields as string[]).join();
        if (inputParams.metric) params.metric = (inputParams.metric as string[]).join();
        const expandedPath = `${path}?${querystring.stringify(params as ParsedUrlQueryInput)}`;
        return this.makeRequest(expandedPath, options);
    }

    private async makeRequest(path: string, options: { [key: string]: string }): Promise<any> {
        const response = await fetch(`${FacebookGraphApi.url}/${path}`, options);
        const json = await response.json();
        if (!response.ok) throw new Error(`Facebook graph error: ${response.statusText}-${json.error.message}`);
        return json;
    }
}
