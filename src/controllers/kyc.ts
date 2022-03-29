import { S3Client } from "../clients/s3";
import { User } from "../models/User";
import { checkPermissions } from "../middleware/authentication";
import { KycUser } from "../types";
import { Firebase } from "../clients/firebase";
import { Request, Response } from "express";
import { VerificationApplication } from "../models/VerificationApplication";
import { Validator } from "../schemas";
import { AcuantApplication, AcuantClient } from "../clients/acuant";
import {
    findKycApplication,
    getApplicationStatus,
    generateFactorsFromKYC,
    asyncHandler,
    getKycStatusDetails,
} from "../util";
import { RAIINMAKER_ORG_NAME } from "../util/constants";
import { KycApplication } from "../types.d";
import { FormattedError, KYC_NOT_FOUND, USER_NOT_FOUND, VERIFICATION_NOT_FOUND } from "../util/errors";

const validator = new Validator();

export const verifyKyc = async (parent: any, args: { userKyc: KycApplication }, context: { user: any }) => {
    try {
        const user = await User.findUserByContext(context.user, ["profile"]);
        if (!user) throw new Error(USER_NOT_FOUND);
        const currentKycApplication = await findKycApplication(user);
        let verificationApplication;
        let factors;
        if (!currentKycApplication || currentKycApplication.kyc.status === "REJECTED") {
            validator.validateKycRegistration(args.userKyc);
            const newAcuantApplication = await AcuantClient.submitApplication(args.userKyc);
            const status = getApplicationStatus(newAcuantApplication);
            verificationApplication = await VerificationApplication.upsert({
                appId: newAcuantApplication.mtid,
                status,
                user,
                reason: getKycStatusDetails(newAcuantApplication),
                record: currentKycApplication?.kyc,
            });
            Firebase.sendKycVerificationUpdate(user?.profile?.deviceToken || "", status);
        } else {
            verificationApplication = currentKycApplication.kyc;
            factors = currentKycApplication.factors;
        }
        return { kycId: verificationApplication?.applicationId, status: verificationApplication?.status, factors };
    } catch (error) {
        throw new FormattedError(error);
    }
};

export const downloadKyc = async (parent: any, args: any, context: { user: any }) => {
    try {
        const user = await User.findUserByContext(context.user, ["profile"]);
        if (!user) throw new Error(USER_NOT_FOUND);
        const kycApplication = await VerificationApplication.findOne({ where: { user } });
        if (!kycApplication) throw new Error(KYC_NOT_FOUND);
        if (kycApplication.status === "PENDING")
            return { kycId: kycApplication.applicationId, status: kycApplication.status };
        if (kycApplication.status === "REJECTED")
            return { kycId: kycApplication.applicationId, status: kycApplication.status };
        const kyc = await S3Client.getAcuantKyc(user.id);
        if (kyc) await S3Client.deleteAcuantKyc(user.id);
        await VerificationApplication.remove(kycApplication);
        return generateFactorsFromKYC(kyc);
    } catch (error) {
        throw new FormattedError(error);
    }
};

export const kycWebhook = asyncHandler(async (req: Request, res: Response) => {
    const kyc: AcuantApplication = req.body;
    const status = getApplicationStatus(kyc);
    const verificationApplication = await VerificationApplication.findOne({
        where: { applicationId: kyc.mtid },
        relations: ["user"],
    });
    if (!verificationApplication) throw new Error(VERIFICATION_NOT_FOUND);
    const user = await User.findOne({ where: { id: verificationApplication.user.id } });
    if (!user) throw new Error(USER_NOT_FOUND);
    if (status === "PENDING") res.json({ success: false });
    if (status === "APPROVED") {
        await S3Client.uploadAcuantKyc(user.id, kyc);
    }
    await verificationApplication.updateStatus(status);
    await verificationApplication.updateReason(getKycStatusDetails(kyc));
    await Firebase.sendKycVerificationUpdate(user?.profile?.deviceToken || "", status);
    res.json({ success: true });
});

export const getKyc = async (_parent: any, args: any, context: { user: any }) => {
    try {
        const user = await User.findUserByContext(context.user);
        if (!user) throw new Error(USER_NOT_FOUND);
        const application = await findKycApplication(user);
        if (!application) throw new Error(KYC_NOT_FOUND);
        return { kycId: application.kyc?.applicationId, status: application.kyc?.status, factors: application.factors };
    } catch (error) {
        throw new FormattedError(error);
    }
};

export const adminGetKycByUser = async (parent: any, args: { userId: string }, context: { user: any }) => {
    checkPermissions({ restrictCompany: RAIINMAKER_ORG_NAME }, context);
    const { userId } = args;
    const user = await User.findOne({ where: { id: userId } });
    if (!user) throw new Error(USER_NOT_FOUND);
    const response = await S3Client.getUserObject(userId);
    if (response) {
        if (response.hasAddressProof) response.addressProof = await S3Client.getKycImage(userId, "addressProof");
        if (response.hasIdProof) response.idProof = await S3Client.getKycImage(userId, "idProof");
    }
    return response;
};

export const updateKyc = async (parent: any, args: { user: KycUser }, context: { user: any }) => {
    const user = await User.findUserByContext(context.user);
    if (!user) throw new Error(USER_NOT_FOUND);
    if (args.user.idProof) {
        await S3Client.uploadKycImage(user.id, "idProof", args.user.idProof);
        delete args.user.idProof;
        args.user.hasIdProof = true;
    }
    if (args.user.addressProof) {
        await S3Client.uploadKycImage(user.id, "addressProof", args.user.addressProof);
        delete args.user.addressProof;
        args.user.hasAddressProof = true;
    }
    await user.save();
    return S3Client.updateUserInfo(user.id, args.user);
};

export const updateKycStatus = async (
    parent: any,
    args: { userId: string; status: string },
    context: { user: any }
) => {
    checkPermissions({ hasRole: ["admin"] }, context);
    if (!["approve", "reject"].includes(args.status)) throw new Error("Status must be either approve or reject");
    const user = await User.findOne({
        where: { id: args.userId },
        relations: ["profile", "notificationSettings"],
    });
    if (!user) throw new Error(USER_NOT_FOUND);
    await user.save();
    if (user.notificationSettings.kyc) {
        if (args.status === "APPROVED") await Firebase.sendKycApprovalNotification(user.profile.deviceToken);
        else await Firebase.sendKycRejectionNotification(user.profile.deviceToken);
    }
    return user.asV1();
};
