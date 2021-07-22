import { Secrets } from "../util/secrets";
import { S3Client } from "./s3";
import { doFetch } from "../util/fetchRequest";
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

    private static adjustTokenExpiry(authData: any) {
        const expiry = new Date().getTime() + authData.expires_in * 1000;
        return { ...authData, expires_in: expiry };
    }

    private static async fetchAuthDataAndCheckExpiry() {
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
            const response = await doFetch(`${this.baseUrl}/v1/oauth/token/user`, null, "POST", payload);
            const authData = await response.json();
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
            const response = await doFetch(`${this.baseUrl}/v1/oauth/token/user`, null, "POST", payload);
            const authData = await response.json();
            if (authData.error) throw new Error("Error refreshing access token for xoxoday");
            const augmentedAuthData = this.adjustTokenExpiry(authData);
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
            const response = await doFetch(`${this.baseUrl}/v1/oauth/api`, authData.access_token, "POST", payload);
            const filters = await response.json();
            if (response.status !== 200) {
                if (!filters || filters.error) {
                    console.log(filters);
                    throw new Error(filters.message);
                }
            }
            return filters;
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
            const response = await doFetch(`${this.baseUrl}/v1/oauth/api`, authData.access_token, "POST", payload);
            const vouchers = await response.json();
            if (response.status !== 200) {
                if (!vouchers || vouchers.error) {
                    console.log(vouchers);
                    throw new Error(vouchers.message);
                }
            }
            return vouchers?.data?.getVouchers?.data;
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
                promiseArray.push(doFetch(`${this.baseUrl}/v1/oauth/api`, authData.access_token, "POST", payload));
            });
            const responseArray = await Promise.all(promiseArray);
            for (let response of responseArray) {
                if (response.status !== 200) {
                    const data = await response.json();
                    if (!data || data.error) {
                        console.log(data);
                        throw new Error(data.message);
                    }
                }
            }
            const statusList: Array<any> = await Promise.all(responseArray.map((item) => item.json()));
            return statusList.map((item, index) => {
                return { ...item.data.placeOrder.data, ...orders[index] };
            });
        } catch (error) {
            throw new Error(error.message);
        }
    }
}
