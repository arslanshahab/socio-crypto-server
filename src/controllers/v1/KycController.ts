import { BodyParams, Context, PathParams } from "@tsed/common";
import { Controller, Inject } from "@tsed/di";
import { BadRequest, NotFound } from "@tsed/exceptions";
import { Get, Post, Property, Required, Returns } from "@tsed/schema";
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

class KycResultModel {
    @Property() public readonly kycId: string;
    @Property() public readonly status: string;
    @Property(Object) public readonly factors: object | undefined;
}
class KycApplication {
    @Required() public readonly firstName: string;
    @Required() public readonly middleName: string;
    @Required() public readonly lastName: string;
    @Required() public readonly email: string;
    @Property() public readonly ip: string;
    @Required() public readonly billingStreetAddress: string;
    @Required() public readonly billingCity: string;
    @Required() public readonly billingCountry: string;
    @Property() public readonly billingZip: number;
    @Property() public readonly zipCode: string;
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
    @(Returns(200, SuccessResult).Of(Object))
    public async verifyKyc(@BodyParams() query: KycApplication, @Context() context: Context) {
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
        return new SuccessResult(result, Object);
    }
}
