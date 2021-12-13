import { S3Client } from "../clients/s3";
import { User } from "../models/User";
import { checkPermissions } from "../middleware/authentication";
import { KycUser } from "../types";
import { Firebase } from "../clients/firebase";
import { asyncHandler } from "../util/helpers";
import { Request, Response } from "express";
import { VerificationApplication } from "../models/VerificationApplication";
import { Validator } from "../schemas";
import { AcuantClient } from "../clients/acuant";
import { findKycApplication, getApplicationStatus } from "../helpers";

const validator = new Validator();

export const verifyKyc = async (parent: any, args: any, context: { user: any }) => {
    const { id } = context.user;
    const user = await User.findOneOrFail({ where: { identityId: id }, relations: ["profile"] });
    if (!user) throw new Error("user not found");
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
    return { kycId: verificationApplication.applicationId, status: verificationApplication.status };
};

export const downloadKyc = async (parent: any, args: { kycId: string }, context: { user: any }) => {
    const kycFactors = await S3Client.getKycFactors(args.kycId);
    if (kycFactors) await S3Client.deleteKycData(args.kycId);
    return kycFactors;
};

export const kycWebhook = asyncHandler(async (req: Request, res: Response) => {
    console.log("Query---", req.query);
    console.log("BODY---", req.body);
    // const { id, state, factors } = req.body;
    // const data = (await S3Client.getKycFactors(id)) as any;
    // if (!data) throw Error("kyc not found");
    // const user = await User.findOneOrFail({ where: { id: data.userId }, relations: ["profile"] });
    // if (factors) await S3Client.uploadAcuantKyc(id, { factors: factors, userId: user.id });
    // await Firebase.sendFactorVerificationUpdate(user.profile.deviceToken, state);
    res.status(200).json({ success: true });
});

export const getKyc = async (_parent: any, args: any, context: { user: any }) => {
    const { id } = context.user;
    const user = await User.findOneOrFail({ where: { identityId: id } });
    if (!user) throw new Error("user not found");
    return await findKycApplication(user);
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
