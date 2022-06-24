import { BodyParams, Context, PathParams, QueryParams } from "@tsed/common";
import { Controller, Inject } from "@tsed/di";
import { BadRequest, NotFound } from "@tsed/exceptions";
import { Get, Post, Property, Put, Required, Returns } from "@tsed/schema";
import { RAIINMAKER_ORG_NAME } from "../../util/constants";
import { KycService } from "../../services/KycService";
import { UserService } from "../../services/UserService";
import { SuccessResult } from "../../util/entities";
import { KYC_NOT_FOUND, USER_NOT_FOUND } from "../../util/errors";
import { findKycApplicationV2, getApplicationStatus, getKycStatusDetails } from "../../util";
import { Validator } from "../../schemas";
import { AcuantClient } from "../../clients/acuant";
import { Firebase } from "../../clients/firebase";
import { VerificationApplicationService } from "../../services/VerificationApplicationService";
import { KycUser } from "../../types";
import { S3Client } from "../../clients/s3";
import { KycUpdateResultModel, UserResultModel } from "../../models/RestModels";

const userResultRelations = {
    profile: true,
    social_link: true,
    participant: { include: { campaign: true } },
    notification_settings: true,
};

class KycResultModel {
    @Property() public readonly kycId: string;
    @Property() public readonly status: string;
    @Property(Object) public readonly factors: object | undefined;
}

class KycStatusParms {
    @Required() public readonly userId: string;
    @Required() public readonly status: string;
}

class VerifyKycParams {
    @Required() public readonly firstName: string;
    @Required() public readonly middleName: string;
    @Required() public readonly lastName: string;
    @Required() public readonly email: string;
    @Required() public readonly billingStreetAddress: string;
    @Required() public readonly billingCity: string;
    @Required() public readonly billingCountry: string;
    @Required() public readonly billingZip: number;
    @Required() public readonly zipCode: string;
    @Required() public readonly gender: string;
    @Required() public readonly dob: string;
    @Required() public readonly phoneNumber: string;
    @Required() public readonly documentType: string;
    @Required() public readonly documentCountry: string;
    @Required() public readonly frontDocumentImage: string;
    @Required() public readonly faceImage: string;
    @Required() public readonly backDocumentImage: string;
}

const validator = new Validator();

@Controller("/kyc")
export class KycController {
    @Inject()
    private userService: UserService;
    @Inject()
    private kycService: KycService;
    @Inject()
    private verificationApplicationService: VerificationApplicationService;

    @Get()
    @(Returns(200, SuccessResult).Of(KycResultModel))
    public async get(@Context() context: Context) {
        const user = await this.userService.findUserByContext(context.get("user"), ["verification_application"]);
        if (!user) throw new BadRequest(USER_NOT_FOUND);
        const application = await this.kycService.getApplication(user);
        if (!application) throw new BadRequest(KYC_NOT_FOUND);
        return new SuccessResult(
            { kycId: application.kyc.applicationId, status: application.kyc.status, factors: application.factors },
            KycResultModel
        );
    }

    @Post("/download")
    @(Returns(200, SuccessResult).Of(Object))
    public async download(@Context() context: Context) {
        const user = await this.userService.findUserByContext(context.get("user"), ["verification_application"]);
        if (!user) throw new BadRequest(USER_NOT_FOUND);
        const kycApplication = user.verification_application;
        if (!kycApplication) throw new BadRequest(KYC_NOT_FOUND);
        if (kycApplication.status === "PENDING")
            return { kycId: kycApplication.applicationId, status: kycApplication.status };
        if (kycApplication.status === "REJECTED")
            return { kycId: kycApplication.applicationId, status: kycApplication.status };
        return this.kycService.clearApplication(user.id, kycApplication.id);
    }

    @Get("/admin/:userId")
    @(Returns(200, SuccessResult).Of(Object))
    public async getAdmin(@PathParams("userId") userId: string, @Context() context: Context) {
        this.userService.checkPermissions({ restrictCompany: RAIINMAKER_ORG_NAME }, context.get("user"));
        const user = await this.userService.findUserById(userId);
        if (!user) throw new NotFound(USER_NOT_FOUND);
        return new SuccessResult(await this.kycService.getRawApplication(user.id), Object);
    }

    @Post("/verify-kyc")
    @(Returns(200, SuccessResult).Of(KycUpdateResultModel))
    public async verifyKyc(@BodyParams() query: VerifyKycParams, @Context() context: Context) {
        const user = await this.userService.findUserByContext(context.get("user"), ["profile"]);
        if (!user) throw new BadRequest(USER_NOT_FOUND);
        const currentKycApplication = await findKycApplicationV2(user);
        let verificationApplication;
        let factors;
        if (!currentKycApplication || currentKycApplication.kyc.status === "REJECTED") {
            validator.validateKycRegistration(query);
            const newAcuantApplication = await AcuantClient.submitApplication(query);
            const status = getApplicationStatus(newAcuantApplication);
            verificationApplication = await this.verificationApplicationService.upsert({
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
        const result = {
            kycId: verificationApplication?.applicationId,
            status: verificationApplication?.status,
            factors,
        };
        return new SuccessResult(result, KycUpdateResultModel);
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
        this.userService.checkPermissions({ hasRole: ["admin"] }, context.get("user"));
        const { userId, status } = query;
        if (!["approve", "reject"].includes(status)) throw new BadRequest("Status must be either approve or reject");
        let user = await this.userService.findUserById(userId, userResultRelations);
        if (!user) throw new NotFound(USER_NOT_FOUND);
        const updatedStatus = await this.kycService.updateKycStatus(user.id, status);
        if (user.notification_settings?.kyc) {
            if (status === "APPROVED") await Firebase.sendKycApprovalNotification(user.profile?.deviceToken!);
            else await Firebase.sendKycRejectionNotification(user.profile?.deviceToken!);
        }
        user.kycStatus = updatedStatus.kycStatus;
        return new SuccessResult(UserResultModel.build(user), UserResultModel);
    }
}
