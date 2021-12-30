import { Firebase } from "../clients/firebase";
import { Admin } from "../models/Admin";
import { Org } from "../models/Org";
import { checkPermissions } from "../middleware/authentication";
import { HourlyCampaignMetric } from "../models/HourlyCampaignMetric";
import { SesClient } from "../clients/ses";
import { FailureByDesign } from "../util/errors";
import { WalletCurrency } from "../models/WalletCurrency";
import { Wallet } from "../models/Wallet";

export const newOrg = async (
    parent: any,
    args: { orgName: string; email: string; name: string },
    context: { user: any }
) => {
    if (context.user.company !== "raiinmaker") throw new Error("forbidden");
    const { orgName, email, name } = args;
    const orgNameToLower = orgName.toLowerCase();
    const password = Math.random().toString(16).substr(2, 15);
    const user = await Firebase.createNewUser(email, password);
    await Firebase.setCustomUserClaims(user.uid, orgNameToLower, "admin", true);
    const org = Org.newOrg(orgNameToLower);
    await org.save();
    const admin = new Admin();
    admin.firebaseId = user.uid;
    admin.org = org;
    admin.name = name;
    await admin.save();
    const wallet = new Wallet();
    wallet.org = org;
    const walletCurrency = WalletCurrency.newWalletCurrency("coiin", wallet);
    await walletCurrency.save();
    await wallet.save();
    await SesClient.sendNewOrgConfirmationEmail(orgName, email, password);
    return org;
};

export const getHourlyOrgMetrics = async (parent: any, args: any, context: { user: any }) => {
    const { company } = checkPermissions({ hasRole: ["admin"] }, context);
    const org = await Org.findOne({ where: { name: company } });
    if (!org) throw new Error("org not found");
    return await HourlyCampaignMetric.getSortedByOrgId(org.id);
};

export const newUser = async (
    parent: any,
    args: { email: string; name: string; role: string },
    context: { user: any }
) => {
    const { company } = checkPermissions({ hasRole: ["admin"] }, context);
    const { email, name, role } = args;
    const password = Math.random().toString(16).substr(2, 15);
    try {
        const org = await Org.findOne({ where: { name: company } });
        if (!org) throw new FailureByDesign("NOT_FOUND", "org not found");
        const user = await Firebase.createNewUser(email, password);
        const userRole = role === "admin" ? "admin" : "manager";
        await Firebase.setCustomUserClaims(user.uid, company, userRole, true);
        const admin = new Admin();
        admin.firebaseId = user.uid;
        admin.org = org;
        admin.name = name;
        await admin.save();
        console.log(await SesClient.sendNewUserConfirmationEmail(org.name, email, password));
    } catch (e) {
        throw new FailureByDesign(e.code, e.message);
    }
    return true;
};

export const listEmployees = async (parent: any, args: { skip: number; take: number }, context: { user: any }) => {
    const { company } = checkPermissions({ hasRole: ["admin"] }, context);
    const { skip = 0, take = 10 } = args;
    const org = await Org.findOne({ where: { name: company } });
    if (!org) throw new Error("org not found");
    const admins = await Admin.listAdminsByOrg(org.id, skip, take);
    return admins.map((admin) => admin.asV1());
};
