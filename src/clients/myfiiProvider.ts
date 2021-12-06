import fetch from "node-fetch";
import {KycApplication, KycResult} from "../types";


const MYFII_URL = 'http://localhost:8080'

export class MyfiiProvider {

    public static async submitApplication(application: KycApplication): Promise<KycResult> {
        const callbackURL = 'http://localhost:4000/v1/dragonfactor/webhook';
        const body = {kyc: {...application}, callbackURL};
        return this.makeRequest('/v1/kyc', body, 'POST');
    }

    private static async makeRequest(path: string, body: object, method: string) {
        const options = {
            method,
            body: JSON.stringify(body),
            headers: { 'Content-Type': 'application/json'}
        }
        const response = await fetch(`${MYFII_URL}${path}`, options);
        return await response.json();
    }
}