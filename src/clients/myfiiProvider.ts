import fetch from "node-fetch";
import { KycApplication, KycResult } from "../types";

export class MyfiiProvider {
    public static baseUrl =
        process.env.NODE_ENV === "production"
            ? "https://provider.api.dragonchain.com"
            : "https://provider-staging.api.dragonchain.com";

    public static async submitApplication(application: KycApplication): Promise<KycResult> {
        const callbackURL = "http://localhost:4000/v1/dragonfactor/webhook";
        const body = { kyc: { ...application }, callbackURL };
        return this.makeRequest("/v1/kyc", body, "POST");
    }

    private static async makeRequest(path: string, body: object, method: string) {
        const options = {
            method,
            body: JSON.stringify(body),
            headers: { "Content-Type": "application/json" },
        };
        const url = `${this.baseUrl}${path}`;
        const response = await fetch(url, options);
        if (response.status !== 200) {
            const error = await response.json();
            throw new Error(error.error);
        }
        return await response.json();
    }
}
