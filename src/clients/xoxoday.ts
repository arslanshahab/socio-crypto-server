import { Secrets } from "../util/secrets";
import { S3Client } from "./s3";
import { doFetch, RequestData } from "../util/fetchRequest";
import { XoxodayOrder } from "src/types";

const { NODE_ENV = "development" } = process.env;
export interface XoxodayAuthData {
    access_token?: string;
    token_type: string;
    expires_in: number;
    refresh_token: string;
}

export class Xoxoday {
    public static baseUrl =
        NODE_ENV === "production" ? "https://accounts.xoxoday.com/chef" : " https://stagingaccount.xoxoday.com/chef";
    public static redirectURI = "https://raiinmaker.com/";

    public static adjustTokenExpiry(authData: any) {
        const expiry = new Date().getTime() + authData.expires_in * 1000;
        return { ...authData, expires_in: expiry };
    }

    public static async fetchAuthDataAndCheckExpiry() {
        let authData: any = await S3Client.getXoxodayAuthData();
        authData = JSON.parse(authData);
        if (authData.expires_in <= new Date().getTime()) {
            authData = await this.refreshAuthData(authData.refresh_token);
        }
        return authData;
    }

    public static async getAuthData(code: String) {
        try {
            const payload = {
                grant_type: "authorization_code",
                code: code,
                redirect_uri: this.redirectURI,
                client_id: Secrets.xoxodayClientID,
                client_secret: Secrets.xoxodayClientSecret,
            };
            const requestData: RequestData = {
                method: "POST",
                url: `${this.baseUrl}/v1/oauth/token/user`,
                payload: payload,
            };
            const authData = await doFetch(requestData);
            if (authData.error) throw new Error("Error fetching access token for xoxoday");
            const augmentedAuthData = this.adjustTokenExpiry(authData);
            await S3Client.refreshXoxodayAuthData(augmentedAuthData);
            return augmentedAuthData;
        } catch (error) {
            return error.message;
        }
    }

    public static async refreshAuthData(refreshToken: string) {
        try {
            const payload = {
                grant_type: "refresh_token",
                refresh_token: refreshToken,
                client_id: Secrets.xoxodayClientID,
                client_secret: Secrets.xoxodayClientSecret,
            };
            const requestData: RequestData = {
                method: "POST",
                url: `${this.baseUrl}/v1/oauth/token/user`,
                payload: payload,
            };
            const response = await doFetch(requestData);
            if (response.error) {
                console.log(response.error);
                throw new Error("Error refreshing access token for xoxoday");
            }
            const augmentedAuthData = this.adjustTokenExpiry(response);
            await S3Client.refreshXoxodayAuthData(augmentedAuthData);
            return augmentedAuthData;
        } catch (error) {
            throw new Error(error.message);
        }
    }

    public static async getFilters() {
        try {
            let authData: any = await this.fetchAuthDataAndCheckExpiry();
            const payload = {
                query: "plumProAPI.mutation.getFilters",
                tag: "plumProAPI",
                variables: {
                    data: {
                        filterGroupCode: "",
                        includeFilters: "",
                        excludeFilters: "",
                    },
                },
            };
            const requestData: RequestData = {
                method: "POST",
                url: `${this.baseUrl}/v1/oauth/api`,
                payload: payload,
                headers: { Authorization: "Bearer " + authData.access_token },
            };
            return await doFetch(requestData);
        } catch (error) {
            throw new Error(error.message);
        }
    }

    public static async getVouchers(country: string, page: number = 1) {
        try {
            let authData: any = await this.fetchAuthDataAndCheckExpiry();
            const payload = {
                query: "plumProAPI.mutation.getVouchers",
                tag: "plumProAPI",
                variables: {
                    data: {
                        limit: 100,
                        page: page,
                        includeProducts: "",
                        excludeProducts: "",
                        sort: {
                            field: "",
                            order: "",
                        },
                        filters: [
                            {
                                key: "country",
                                value: country,
                            },
                        ],
                    },
                },
            };
            const requestData: RequestData = {
                method: "POST",
                url: `${this.baseUrl}/v1/oauth/api`,
                payload: payload,
                headers: { Authorization: "Bearer " + authData.access_token },
            };
            const response = await doFetch(requestData);
            return response?.data?.getVouchers?.data;
        } catch (error) {
            console.log(error);
            throw new Error(error.message);
        }
    }

    public static async placeOrder(orders: Array<XoxodayOrder>) {
        try {
            let authData: any = await this.fetchAuthDataAndCheckExpiry();
            const promiseArray: Array<Promise<any>> = [];
            orders.forEach((order) => {
                const payload = {
                    query: "plumProAPI.mutation.placeOrder",
                    tag: "plumProAPI",
                    variables: {
                        data: order,
                    },
                };
                const requestData: RequestData = {
                    method: "POST",
                    url: `${this.baseUrl}/v1/oauth/api`,
                    payload: payload,
                    headers: { Authorization: "Bearer " + authData.access_token },
                };
                promiseArray.push(doFetch(requestData));
            });
            const responseArray = await Promise.all(promiseArray);
            return responseArray.map((item, index) => {
                return { ...item.data.placeOrder.data, ...orders[index] };
            });
        } catch (error) {
            throw new Error(error.message);
        }
    }
}
