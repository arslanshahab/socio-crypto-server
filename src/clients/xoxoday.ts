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
            await S3Client.refreshXoxodayAuthData(authData);
            return { success: true };
        } catch (error) {
            return error.message;
        }
    }

    public static async refreshAuthData() {
        try {
            console.log("refreshing xoxoday tokens.....");
            let data: any = await S3Client.getXoxodayAuthData();
            console.log("fetcing previous xoxoday tokens.....");
            data = JSON.parse(data);
            const payload = {
                grant_type: "refresh_token",
                refresh_token: data.refresh_token,
                client_id: Secrets.xoxodayClientID,
                client_secret: Secrets.xoxodayClientSecret,
            };
            const response = await doFetch(`${this.baseUrl}/v1/oauth/token/user`, null, "POST", payload);
            const authData = await response.json();
            console.log("fetched new xoxoday tokens.....");
            if (authData.error) throw new Error("Error refreshing access token for xoxoday");
            await S3Client.refreshXoxodayAuthData(authData);
            console.log("uploaded new xoxoday tokens.....");
            return { success: true };
        } catch (error) {
            throw new Error(error.message);
        }
    }

    public static async getFilters() {
        try {
            let authData: any = await S3Client.getXoxodayAuthData();
            authData = JSON.parse(authData);
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
            return filters;
        } catch (error) {
            throw new Error(error.message);
        }
    }

    public static async getVouchers(country: string, page: number = 1) {
        try {
            let authData: any = await S3Client.getXoxodayAuthData();
            authData = JSON.parse(authData);
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
            const data = await response.json();
            if (data.error) {
                console.log(data);
                throw new Error(data.message);
            }
            return data?.data?.getVouchers?.data;
        } catch (error) {
            console.log(error);
            throw new Error(error.message);
        }
    }

    public static async placeOrder(orders: Array<XoxodayOrder>) {
        try {
            let authData: any = await S3Client.getXoxodayAuthData();
            authData = JSON.parse(authData);
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
            const statusList: Array<any> = await Promise.all(responseArray.map((item) => item.json()));
            const data = statusList[0];
            if (!data || data.error) {
                console.log(data);
                throw new Error(data.message);
            }
            return statusList.map((item, index) => {
                return { ...item.data.placeOrder.data, ...orders[index] };
            });
        } catch (error) {
            throw new Error(error.message);
        }
    }
}
