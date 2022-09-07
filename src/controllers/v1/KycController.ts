import { BodyParams, Context, PathParams, QueryParams } from "@tsed/common";
import { Controller, Inject } from "@tsed/di";
import { BadRequest, NotFound } from "@tsed/exceptions";
import { Get, Nullable, Post, Put, Required, Returns } from "@tsed/schema";
import { ADMIN, KycLevel, KycStatus, MANAGER, RAIINMAKER_ORG_NAME } from "../../util/constants";
import { UserService } from "../../services/UserService";
import { SuccessResult } from "../../util/entities";
import { KYC_LEVEL_1_NOT_APPROVED, KYC_NOT_FOUND, USER_NOT_FOUND, VERIFICATION_NOT_FOUND } from "../../util/errors";
import { Firebase } from "../../clients/firebase";
import { VerificationApplicationService } from "../../services/VerificationApplicationService";
import { KycUser } from "../../types";
import { S3Client } from "../../clients/s3";
import { BooleanResultModel, KycResultModel, UserResultModel } from "../../models/RestModels";
import { AdminService } from "../../services/AdminService";
import { AcuantApplication } from "../../clients/acuant";
import { getApplicationStatus, getKycStatusDetails } from "../../util";

const userResultRelations = {
    profile: true,
    social_link: true,
    participant: { include: { campaign: true } },
    notification_settings: true,
};

class KycStatusParms {
    @Required() public readonly userId: string;
    @Required() public readonly status: string;
}

class KycLevel1Params {
    @Required() public readonly firstName: string;
    @Nullable(String) public readonly middleName: string;
    @Required() public readonly lastName: string;
    @Required() public readonly email: string;
    @Required() public readonly billingStreetAddress: string;
    @Required() public readonly billingCity: string;
    @Required() public readonly billingCountry: string;
    @Required() public readonly zipCode: string;
    @Required() public readonly gender: string;
    @Required() public readonly dob: string;
    @Required() public readonly phoneNumber: string;
    @Nullable(String) public readonly ip: string;
}

class KycLevel2Params {
    @Required() public readonly documentType: string;
    @Required() public readonly documentCountry: string;
    @Required() public readonly frontDocumentImage: string;
    @Required() public readonly faceImage: string;
    @Required() public readonly backDocumentImage: string;
}

@Controller("/kyc")
export class KycController {
    @Inject()
    private userService: UserService;
    @Inject()
    private verificationApplicationService: VerificationApplicationService;
    @Inject()
    private adminService: AdminService;

    @Get()
    @(Returns(200, SuccessResult).Of(KycResultModel))
    public async get(@Context() context: Context) {
        const user = await this.userService.findUserByContext(context.get("user"), ["verification_application"]);
        if (!user) throw new BadRequest(USER_NOT_FOUND);
        const application = await this.verificationApplicationService.getApplication(user.id);
        if (!application) throw new BadRequest(KYC_NOT_FOUND);
        return new SuccessResult(
            { kycId: application.kyc.applicationId, status: application.kyc.status },
            KycResultModel
        );
    }

    @Post("/download")
    @(Returns(200, SuccessResult).Of(Object))
    public async download(@Context() context: Context) {
        const user = await this.userService.findUserByContext(context.get("user"));
        if (!user) throw new BadRequest(USER_NOT_FOUND);
        const kycApplication = await this.verificationApplicationService.findByUserIdAndLevel(user.id, KycLevel.LEVEL2);
        if (!kycApplication) throw new BadRequest(KYC_NOT_FOUND);
        if (kycApplication.status === "PENDING")
            return { kycId: kycApplication.applicationId, status: kycApplication.status };
        if (kycApplication.status === "REJECTED")
            return { kycId: kycApplication.applicationId, status: kycApplication.status };
        return this.verificationApplicationService.clearApplication(user.id, kycApplication.id);
    }

    @Get("/admin/:userId")
    @(Returns(200, SuccessResult).Of(Object))
    public async getAdmin(@PathParams("userId") userId: string, @Context() context: Context) {
        await this.adminService.checkPermissions({ restrictCompany: RAIINMAKER_ORG_NAME }, context.get("user"));
        const user = await this.userService.findUserById(userId);
        if (!user) throw new NotFound(USER_NOT_FOUND);
        return new SuccessResult(await this.verificationApplicationService.getRawApplication(user.id), Object);
    }

    @Post("/verify/level1")
    @(Returns(200, SuccessResult).Of(KycResultModel))
    public async verifyKycLevel1(@BodyParams() query: KycLevel1Params, @Context() context: Context) {
        const user = await this.userService.findUserByContext(context.get("user"), ["profile"]);
        if (!user) throw new BadRequest(USER_NOT_FOUND);
        query = { ...query, ip: context.request.req.socket.remoteAddress || "" };
        const result = await this.verificationApplicationService.registerKyc({ user, query, level: KycLevel.LEVEL1 });
        return new SuccessResult(result, KycResultModel);
    }

    @Post("/verify/level2")
    @(Returns(200, SuccessResult).Of(KycResultModel))
    public async verifyKycLevel2(@BodyParams() query: KycLevel2Params, @Context() context: Context) {
        const user = await this.userService.findUserByContext(context.get("user"), { profile: true });
        if (!user) throw new BadRequest(USER_NOT_FOUND);
        if (!(await this.verificationApplicationService.isLevel1Approved(user.id)))
            throw new BadRequest(KYC_LEVEL_1_NOT_APPROVED);
        query = {
            ...(await this.verificationApplicationService.getProfileData(user.id, KycLevel.LEVEL1)),
            ...query,
        };
        const result = await this.verificationApplicationService.registerKyc({ user, query, level: KycLevel.LEVEL2 });
        return new SuccessResult(result, KycResultModel);
    }

    @Put("/update-kyc")
    @(Returns(200, SuccessResult).Of(KycResultModel))
    public async updateKyc(@BodyParams() query: KycUser, @Context() context: Context) {
        const user = await this.userService.findUserByContext(context.get("user"));
        if (!user) throw new BadRequest(USER_NOT_FOUND);
        if (query.idProof) {
            await S3Client.uploadKycImage(user.id, "idProof", query.idProof);
            delete query.idProof;
            query.hasIdProof = true;
        }
        if (query.addressProof) {
            await S3Client.uploadKycImage(user.id, "addressProof", query.addressProof);
            delete query.addressProof;
            query.hasAddressProof = true;
        }
        const result = await S3Client.updateUserInfo(user.id, query);
        return new SuccessResult(result, KycResultModel);
    }

    @Put("/update-kyc-status")
    @(Returns(200, SuccessResult).Of(UserResultModel))
    public async updateKycStatus(@QueryParams() query: KycStatusParms, @Context() context: Context) {
        await this.adminService.checkPermissions({ hasRole: [ADMIN, MANAGER] }, context.get("user"));
        const { userId, status } = query;
        if (!["approve", "reject"].includes(status)) throw new BadRequest("Status must be either approve or reject");
        let user = await this.userService.findUserById(userId, userResultRelations);
        if (!user) throw new NotFound(USER_NOT_FOUND);
        const updatedStatus = await this.verificationApplicationService.updateKycStatus(user.id, status);
        if (user.notification_settings?.kyc) {
            if (status === "APPROVED") await Firebase.sendKycApprovalNotification(user.profile?.deviceToken!);
            else await Firebase.sendKycRejectionNotification(user.profile?.deviceToken!);
        }
        user.kycStatus = updatedStatus.kycStatus;
        return new SuccessResult(UserResultModel.build(user), UserResultModel);
    }

    // For admin panel
    @Post("/verify-admin")
    @(Returns(200, SuccessResult).Of(KycResultModel))
    public async verifyAdmin(@BodyParams() body: KycLevel1Params & KycLevel2Params, @Context() context: Context) {
        const admin = await this.adminService.findAdminByFirebaseId(context.get("user").id);
        if (!admin) throw new BadRequest(USER_NOT_FOUND);
        body = {
            ...(await this.verificationApplicationService.getAdminProfileData(admin.id)),
            ...body,
            ip: context.request.req.socket.remoteAddress || "",
        };
        const result = await this.verificationApplicationService.registerKycForAdmin({ admin, query: body });
        return new SuccessResult(result, KycResultModel);
    }

    @Post("/webhook")
    @(Returns(200, SuccessResult).Of(BooleanResultModel))
    public async kycWebhook(@BodyParams() body: AcuantApplication) {
        const kyc = body;
        const status = getApplicationStatus(kyc);
        const verificationApplication = await this.verificationApplicationService.findUserApplication(kyc.mtid);
        if (!verificationApplication?.userId && !verificationApplication?.adminId)
            throw new NotFound(VERIFICATION_NOT_FOUND);
        const kycUser = await this.verificationApplicationService.findKycUser({
            userId: verificationApplication.userId || "",
            adminId: verificationApplication.adminId || "",
        });
        if (!kycUser) throw new NotFound(USER_NOT_FOUND);
        if (status === KycStatus.PENDING) return new SuccessResult({ success: false }, BooleanResultModel);
        if (status === KycStatus.APPROVED) {
            await S3Client.uploadAcuantKyc(kycUser.id, kyc);
        }
        await this.verificationApplicationService.updateStatus(status, verificationApplication);
        await this.verificationApplicationService.updateReason(getKycStatusDetails(kyc), kycUser.id);
        if (kycUser.user) await Firebase.sendKycVerificationUpdate(kycUser.user?.profile?.deviceToken || "", status);
        return new SuccessResult({ success: true }, BooleanResultModel);
    }
}
