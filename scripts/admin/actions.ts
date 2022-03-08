import { Firebase } from "../../src/clients/firebase";
import { Admin } from "../../src/models/Admin";
import { Org } from "../../src/models/Org";
import { WalletCurrency } from "../../src/models/WalletCurrency";
import { Wallet } from "../../src/models/Wallet";
import { CryptoCurrency } from "../../src/models/CryptoCurrency";
import { ExternalAddress } from "../../src/models/ExternalAddress";
import * as dotenv from "dotenv";
dotenv.config();

const {
    CURRENCY_TYPE = "coiin",
    CONTRACT_ADDRESS = "",
    NAME = "developer",
    EMAIL = "testing@raiinmaker.com",
    PASSWORD = "raiinmaker",
    ORG_NAME = "raiinmaker",
    TEMP_PASSWORD = "false",
} = process.env;

export const addAddress = async () => {
    const org = await Org.findOneOrFail({ where: { name: ORG_NAME }, relations: ["wallet"] });
    const address = new ExternalAddress();
    address.ethereumAddress = "0x955250Fd0F7f4F6eE3570535f9B7AD3B8141F148".toLowerCase();
    address.claimed = true;
    address.claimMessage = "bacon";
    address.wallet = org.wallet;
    await address.save();
};

export const addCurrencyToOrgWallet = async () => {
    const org = await Org.findOneOrFail({ where: { name: ORG_NAME }, relations: ["wallet"] });
    const walletCurrency = new WalletCurrency();
    walletCurrency.type = CURRENCY_TYPE.toLowerCase();
    walletCurrency.wallet = org.wallet;
    await walletCurrency.save();
};

export const addSupportedCurrency = async () => {
    const crypto = new CryptoCurrency();
    console.log(
        "CURRENCY TYPE:",
        `[${CURRENCY_TYPE.toLowerCase()}]`,
        "CONTRACT ADDRESS:",
        `[${CONTRACT_ADDRESS.toLowerCase()}]`
    );
    crypto.type = CURRENCY_TYPE.toLowerCase();
    crypto.contractAddress = CONTRACT_ADDRESS.toLowerCase();
    await crypto.save();
};

export const promoteToAdmin = async (email: string) => {
    var user = await Firebase.getUserByEmail(email);
    await Firebase.setCustomUserClaims(user.uid, "raiinmaker", "admin", TEMP_PASSWORD === "false");
};

export const updateFirebasePassword = async (email: string, password: string) => {
    var user = await Firebase.getUserByEmail(email);
    await Firebase.updateUserPassword(user.uid, password);
};

export const createNewOrg = async () => {
    let user;
    try {
        user = await Firebase.createNewUser(EMAIL, PASSWORD);
    } catch (e) {
        user = await Firebase.getUserByEmail(EMAIL);
    }
    await Firebase.setCustomUserClaims(user.uid, ORG_NAME, "admin", TEMP_PASSWORD === "false");
    const org = Org.newOrg(ORG_NAME);
    await org.save();
    const admin = new Admin();
    admin.firebaseId = user.uid;
    admin.org = org;
    admin.name = NAME;
    await admin.save();
    const wallet = new Wallet();
    wallet.org = org;
    await wallet.save();
};

export const addAccountToOrg = async () => {
    console.log("Adding account to existing org");
    let user;
    try {
        user = await Firebase.createNewUser(EMAIL, PASSWORD);
    } catch (e) {
        user = await Firebase.getUserByEmail(EMAIL);
    }
    await Firebase.setCustomUserClaims(user.uid, ORG_NAME, "admin", TEMP_PASSWORD === "false");
    const org = await Org.findOne({ where: { name: ORG_NAME } });
    if (!org) throw new Error("org not found");
    const admin = new Admin();
    admin.firebaseId = user.uid;
    admin.org = org;
    admin.name = NAME;
    await admin.save();
    console.log("CLOSING CONNECTION");
};
