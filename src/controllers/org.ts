import { Admin } from "../models/Admin";
import { Org } from "../models/Org";
import { checkPermissions } from "../middleware/authentication";
import { HourlyCampaignMetric } from "../models/HourlyCampaignMetric";
import { SesClient } from "../clients/ses";
import { FormattedError, INVALID_USER_COMPANY, ORG_NOT_FOUND } from "../util/errors";
import { WalletCurrency } from "../models/WalletCurrency";
import { Wallet } from "../models/Wallet";
import { RAIINMAKER_ORG_NAME } from "../util/constants";
import { FirebaseAdmin } from "../clients/firebaseAdmin";

export const newOrg = async (
    parent: any,
    args: { orgName: string; email: string; name: string },
    context: { user: any }
) => {
    try {
        if (context.user.company !== RAIINMAKER_ORG_NAME) throw new Error(INVALID_USER_COMPANY);
        const { orgName, email, name } = args;
        const orgNameToLower = orgName.toLowerCase();
        const password = Math.random().toString(16).substr(2, 15);
        const user = await FirebaseAdmin.createNewUser(email, password);
        await FirebaseAdmin.setCustomUserClaims(user.uid, orgNameToLower, "admin", true);
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
        await SesClient.sendNewOrgCreationEmail(orgName, email);
        return org;
    } catch (error) {
        throw new FormattedError(error);
    }
};
export const listOrgs = async (parent: any, args: { skip: number; take: number }, context: { user: any }) => {
    try {
        if (context.user.company !== "raiinmaker") throw new Error(INVALID_USER_COMPANY);
        const { skip = 0, take = 10 } = args;
        const orgs = await Org.listOrgs(skip, take);
        return orgs.map((org) => org.asV1());
    } catch (error) {
        throw new FormattedError(error);
    }
};

export const getHourlyOrgMetrics = async (parent: any, args: any, context: { user: any }) => {
    try {
        const { company } = checkPermissions({ hasRole: ["admin"] }, context);
        const org = await Org.findOne({ where: { name: company } });
        if (!org) throw new Error(ORG_NOT_FOUND);
        return await HourlyCampaignMetric.getSortedByOrgId(org.id);
    } catch (error) {
        throw new FormattedError(error);
    }
};

export const getOrgDetails = async (parent: any, args: any, context: { user: any }) => {
    try {
        const orgDetail = await Org.orgDetails();
        return orgDetail;
    } catch (error) {
        throw new FormattedError(error);
    }
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
        if (!org) throw new Error(ORG_NOT_FOUND);
        const user = await FirebaseAdmin.createNewUser(email, password);
        const userRole = role === "admin" ? "admin" : "manager";
        await FirebaseAdmin.setCustomUserClaims(user.uid, company, userRole, true);
        const admin = new Admin();
        admin.firebaseId = user.uid;
        admin.org = org;
        admin.name = name;
        await admin.save();
        console.log(await SesClient.sendNewUserConfirmationEmail(org.name, email, password));
    } catch (error) {
        throw new FormattedError(error);
    }
    return true;
};

export const listEmployees = async (parent: any, args: { skip: number; take: number }, context: { user: any }) => {
    try {
        const { company } = checkPermissions({ hasRole: ["admin"] }, context);
        const { skip = 0, take = 10 } = args;
        const org = await Org.findOne({ where: { name: company } });
        if (!org) throw new Error(ORG_NOT_FOUND);
        const admins = await Admin.listAdminsByOrg(org.id, skip, take);
        const orgName = org?.name;
        const adminsDetails = admins.map((admin) => {
            return {
                name: admin.name,
                createdAt: admin.createdAt,
            };
        });
        return { adminsDetails, orgName };
    } catch (error) {
        throw new FormattedError(error);
    }
};
