import { Inject, Injectable } from "@tsed/di";
import { PrismaService } from ".prisma/client/entities";
import { User, VerificationApplication } from "@prisma/client";
import { KycStatus } from "../types";
import { S3Client } from "../clients/s3";
import { generateFactorsFromKYC, getApplicationStatus, getKycStatusDetails } from "../util/index";
import { AcuantClient } from "../clients/acuant";
// import { KycLevel, KycStatus as KycStatusEnum } from "../util/constants";

@Injectable()
export class VerificationApplicationService {
    @Inject()
    private prismaService: PrismaService;

    public async upsert(data: {
        record?: VerificationApplication;
        appId: string;
        status: KycStatus;
        user: User;
        reason: string;
    }) {
        return await this.prismaService.verificationApplication.upsert({
            where: { id: data.record?.id },
            update: {
                applicationId: data.appId,
                status: data.status,
                userId: data.user.id,
                reason: data.reason,
                updatedAt: new Date(),
            },
            create: {
                applicationId: data.appId,
                status: data.status,
                userId: data.user.id,
                reason: data.reason,
            },
        });
    }

    public async findKycApplication(user: User, level: number) {
        const recordedApplication = await this.prismaService.verificationApplication.findFirst({
            where: { userId: user.id },
        });
        if (!recordedApplication) return null;
        let kycApplication;
        if (recordedApplication.status === "APPROVED") {
            kycApplication = await S3Client.getAcuantKyc(user.id);
            return {
                kyc: recordedApplication,
                factors: generateFactorsFromKYC(kycApplication),
            };
        }
        if (recordedApplication.status === "PENDING") {
            kycApplication = await AcuantClient.getApplication(recordedApplication.applicationId);
            const status = getApplicationStatus(kycApplication);
            const reason = getKycStatusDetails(kycApplication);
            let factors;
            if (status === "APPROVED") {
                await S3Client.uploadAcuantKyc(user.id, kycApplication);
                factors = generateFactorsFromKYC(kycApplication);
            }
            await this.updateStatus(status, recordedApplication);
            await this.updateReason(reason, recordedApplication.id);
            return { kyc: recordedApplication, factors };
        }
        return { kyc: recordedApplication };
    }

    //! Update Kyc Status
    public async updateStatus(newStatus: string, data: VerificationApplication) {
        let updatedApplication;
        if (data.status !== newStatus && data.status !== "APPROVED") {
            updatedApplication = await this.prismaService.verificationApplication.update({
                where: {
                    id: data.id,
                },
                data: {
                    status: newStatus,
                },
            });
        }
        return updatedApplication;
    }

    //! Update Kyc Reason
    public async updateReason(newReason: string, id: string) {
        return await this.prismaService.verificationApplication.update({
            where: { id },
            data: {
                reason: newReason,
            },
        });
    }

    // public async isLevel1Approved(userId: string) {
    //     return (
    //         (await this.prismaService.verificationApplication.findFirst({ where: { userId }, level: KycLevel.LEVEL1 }))?.status ===
    //         KycStatusEnum.APPROVED
    //     );
    // }

    // public async isLevel2Approved(userId: string) {
    //     return (
    //         (await this.prismaService.verificationApplication.findFirst({ where: { userId }, level: KycLevel.LEVEL2 }))?.status ===
    //         KycStatusEnum.APPROVED
    //     );
    // }
}
