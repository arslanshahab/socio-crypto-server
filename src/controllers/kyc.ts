import { S3Client } from "../clients/s3";
import { User } from "../models/User";
import { checkPermissions } from "../middleware/authentication";
import { KycUser } from "../types";
import { Firebase } from "../clients/firebase";
import { asyncHandler } from "../util/helpers";
import { Request, Response } from "express";
import { VerificationApplication } from "../models/VerificationApplication";
import { Validator } from "../schemas";
import { AcuantApplication, AcuantClient } from "../clients/acuant";
import { findKycApplication, getApplicationStatus } from "../helpers";
import { generateFactorsFromKYC } from "../helpers/index";

const validator = new Validator();

export const verifyKyc = async (parent: any, args: any, context: { user: any }) => {
    const { id } = context.user;
    const user = await User.findOneOrFail({ where: { identityId: id }, relations: ["profile"] });
    if (!user) throw new Error("user not found");
    if (user.kycStatus === "APPROVED") throw new Error("user is already kyc verified");
    const currentKycApplication = await findKycApplication(user);
    if (currentKycApplication) return currentKycApplication;
    const { userKyc } = args;
    validator.validateKycRegistration(userKyc);
    const newAcuantApplication = await AcuantClient.submitApplication(userKyc);
    const verificationApplication = await VerificationApplication.newApplication(
        newAcuantApplication.mtid,
        getApplicationStatus(newAcuantApplication),
        user
    );
    await user.updateKycStatus(verificationApplication.status);
    return { kycId: verificationApplication.applicationId, status: verificationApplication.status };
};

export const downloadKyc = async (parent: any, args: any, context: { user: any }) => {
    const { id } = context.user;
    const user = await User.findOneOrFail({ where: { identityId: id }, relations: ["profile"] });
    if (!user) throw new Error("user not found");
    const kycApplication = await VerificationApplication.findOne({ where: { user } });
    if (!kycApplication) throw new Error("kyc data not found for user");
    if (kycApplication.status === "PENDING")
        return { kycId: kycApplication.applicationId, status: kycApplication.status };
    if (kycApplication.status === "REJECTED")
        return { kycId: kycApplication.applicationId, status: kycApplication.status };
    const kyc = await S3Client.getAcuantKyc(user.id);
    if (kyc) await S3Client.deleteAcuantKyc(user.id);
    await VerificationApplication.remove(kycApplication);
    return generateFactorsFromKYC(kyc);
};

export const kycWebhook = asyncHandler(async (req: Request, res: Response) => {
    const kyc: AcuantApplication = req.body;
    const status = getApplicationStatus(kyc);
    const verificationApplication = await VerificationApplication.findOne({ where: { applicationId: kyc.mtid } });
    if (!verificationApplication) throw new Error("application not found");
    const user = await User.findOne({ where: { id: verificationApplication.user } });
    if (!user) throw new Error("user not found");
    if (status === "PENDING") res.json({ succes: false });
    if (status === "APPROVED") {
        await S3Client.uploadAcuantKyc(user.id, kyc);
        await verificationApplication.updateStatus(status);
        await user.updateKycStatus(status);
    }
    if (status === "REJECTED") {
        await VerificationApplication.remove(verificationApplication);
        await user.updateKycStatus("");
    }
    await Firebase.sendKycVerificationUpdate(user.profile.deviceToken, status);
    res.json({ success: true });
});

export const getKyc = async (_parent: any, args: any, context: { user: any }) => {
    const { id } = context.user;
    const user = await User.findOneOrFail({ where: { identityId: id } });
    if (!user) throw new Error("user not found");
    const application = await findKycApplication(user);
    if (!application) throw new Error("kyc application not found");
    return application;
};

export const adminGetKycByUser = async (parent: any, args: { userId: string }, context: { user: any }) => {
    checkPermissions({ restrictCompany: "raiinmaker" }, context);
    const { userId } = args;
    const user = await User.findOne({ where: { id: userId } });
    if (!user) throw new Error("user not found");
    const response = await S3Client.getUserObject(userId);
    if (response) {
        if (response.hasAddressProof) response.addressProof = await S3Client.getKycImage(userId, "addressProof");
        if (response.hasIdProof) response.idProof = await S3Client.getKycImage(userId, "idProof");
    }
    return response;
};

export const updateKyc = async (parent: any, args: { user: KycUser }, context: { user: any }) => {
    const { id } = context.user;
    const user = await User.findOneOrFail({ where: { identityId: id } });
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
    user.kycStatus = "PENDING";
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
    const user = await User.findOneOrFail({
        where: { id: args.userId },
        relations: ["profile", "notificationSettings"],
    });
    user.kycStatus = args.status == "APPROVED" ? "APPROVED" : "REJECTED";
    await user.save();
    if (user.notificationSettings.kyc) {
        if (user.kycStatus === "APPROVED") await Firebase.sendKycApprovalNotification(user.profile.deviceToken);
        else await Firebase.sendKycRejectionNotification(user.profile.deviceToken);
    }
    return user.asV1();
};
