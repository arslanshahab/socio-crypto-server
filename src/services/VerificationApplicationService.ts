import { Inject, Injectable } from "@tsed/di";
import { PrismaService } from ".prisma/client/entities";
import { S3Client } from "../clients/s3";
import { generateFactorsFromKYC, getApplicationStatus, getKycStatusDetails } from "../util";
import { AcuantClient } from "../clients/acuant";
import { Profile, User, VerificationApplication } from "@prisma/client";
import { KycApplication, KycStatus } from "../types";
import { KycLevel, KycStatus as KycStatusEnum } from "../util/constants";
import { Firebase } from "../clients/firebase";
import { Validator } from "../schemas";

const validator = new Validator();

@Injectable()
export class VerificationApplicationService {
    @Inject()
    private prismaService: PrismaService;

    public async updateKycStatus(userId: string, kycStatus: string) {
        return await this.prismaService.user.update({
            where: { id: userId },
            data: { kycStatus: kycStatus.toUpperCase() },
        });
    }

    public async findByUserIdAndLevel(userId: string, level: KycLevel) {
        return await this.prismaService.verificationApplication.findFirst({ where: { userId, level } });
    }

    public async getProfileData(userId: string, level: KycLevel): Promise<KycApplication> {
        const app = await this.prismaService.verificationApplication.findFirst({ where: { userId, level } });
        return app?.profile ? JSON.parse(app.profile) : {};
    }

    public async upsert(data: {
        level: KycLevel;
        record?: VerificationApplication;
        appId: string;
        status: KycStatus;
        userId: string;
        reason: string;
        profile?: string;
    }) {
        return await this.prismaService.verificationApplication.upsert({
            where: { id: data.record?.id || data.userId },
            update: {
                applicationId: data.appId,
                status: data.status,
                userId: data.userId,
                reason: data.reason,
            },
            create: {
                applicationId: data.appId,
                status: data.status,
                userId: data.userId,
                reason: data.reason,
                level: data.level,
                profile: data.profile,
            },
        });
    }

    public async findKycApplication(userId: string, level: KycLevel) {
        const recordedApplication = await this.prismaService.verificationApplication.findFirst({
            where: { userId: userId, level },
        });
        if (!recordedApplication) return null;
        let kycApplication;
        if (recordedApplication.status === KycStatusEnum.APPROVED) {
            return {
                kyc: recordedApplication,
            };
        }
        if (recordedApplication.status === KycStatusEnum.PENDING) {
            kycApplication = await AcuantClient.getApplication(recordedApplication.applicationId);
            const status = getApplicationStatus(kycApplication);
            const reason = getKycStatusDetails(kycApplication);
            if (status === KycStatusEnum.APPROVED) {
                await S3Client.uploadAcuantKyc(userId, kycApplication);
            }
            await this.updateStatus(status, recordedApplication);
            await this.updateReason(reason, recordedApplication.id);
            return { kyc: recordedApplication };
        }
        return { kyc: recordedApplication };
    }

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

    public async updateReason(newReason: string, id: string) {
        return await this.prismaService.verificationApplication.update({
            where: { id },
            data: {
                reason: newReason,
            },
        });
    }

    public async isLevel1Approved(userId: string) {
        return (
            (await this.prismaService.verificationApplication.findFirst({ where: { userId, level: KycLevel.LEVEL1 } }))
                ?.status === KycStatusEnum.APPROVED
        );
    }

    public async isLevel2Approved(userId: string) {
        return (
            (await this.prismaService.verificationApplication.findFirst({ where: { userId, level: KycLevel.LEVEL2 } }))
                ?.status === KycStatusEnum.APPROVED
        );
    }

    public async getKycData(userId: string) {
        console.log("userid---------", userId);
        const level1Status = (await this.findByUserIdAndLevel(userId, KycLevel.LEVEL2))?.status as KycLevel;
        const level2Status = (await this.findByUserIdAndLevel(userId, KycLevel.LEVEL2))?.status as KycLevel;
        return {
            level1: level1Status || level2Status,
            level2: level2Status,
        };
    }

    public async registerKyc(data: {
        user: User & { profile?: Profile | null };
        level: KycLevel;
        query: KycApplication;
    }) {
        const { user, level, query } = data;
        const currentKycApplication = await this.findKycApplication(user?.id, level);
        let verificationApplication;
        if (!currentKycApplication || currentKycApplication.kyc.status === KycStatusEnum.REJECTED) {
            if (level === KycLevel.LEVEL1) {
                validator.validateKycLevel1(query);
            } else {
                validator.validateKycLevel2(query);
            }
            const newAcuantApplication = await AcuantClient.submitApplicationV2(query, level);
            const status = getApplicationStatus(newAcuantApplication);
            verificationApplication = await this.upsert({
                level,
                appId: newAcuantApplication.mtid,
                status,
                userId: user.id,
                reason: getKycStatusDetails(newAcuantApplication),
                record: currentKycApplication?.kyc,
                profile: level === KycLevel.LEVEL1 ? JSON.stringify(query) : undefined,
            });
            Firebase.sendKycVerificationUpdate(user?.profile?.deviceToken || "", status);
        } else {
            verificationApplication = currentKycApplication.kyc;
        }
        return {
            kycId: verificationApplication?.applicationId,
            status: verificationApplication?.status,
        };
    }

    /**
     * Retrieves a kyc application for the given user
     *
     * @param userId the id of user to retrieve the kyc application for
     * @returns the kyc application for the given user, if one exists
     */
    public async getApplication(userId: string) {
        const recordedApplication = await this.findByUserIdAndLevel(userId, KycLevel.LEVEL1);
        if (!recordedApplication) return null;
        let kycApplication;
        if (recordedApplication.status === "APPROVED") {
            kycApplication = await S3Client.getAcuantKyc(userId);
            return {
                kyc: recordedApplication,
            };
        }
        if (recordedApplication.status === "PENDING") {
            kycApplication = await AcuantClient.getApplication(recordedApplication.applicationId);
            const status = getApplicationStatus(kycApplication);
            const reason = getKycStatusDetails(kycApplication);
            if (status === "APPROVED") {
                await S3Client.uploadAcuantKyc(userId, kycApplication);
            }
            // update status and reason
            this.prismaService.verificationApplication.update({
                data: { status, reason },
                where: { id: recordedApplication.id },
            });
            return { kyc: recordedApplication };
        }
        return { kyc: recordedApplication };
    }

    /**
     * Retrieves the raw kyc application stored in S3 for the given user
     *
     * @param userId the user to retrieve the kyc application for
     * @returns the kyc application for the given user, if one exists
     */
    public async getRawApplication(userId: string) {
        const response = await S3Client.getUserObject(userId);
        if (response) {
            if (response.hasAddressProof) response.addressProof = await S3Client.getKycImage(userId, "addressProof");
            if (response.hasIdProof) response.idProof = await S3Client.getKycImage(userId, "idProof");
        }
        return response;
    }

    /**
     * Clears the kyc application for the given user from S3 and the DB
     *
     * @param userId the user to clear the kyc application for
     * @param verificationApplicationId the id of the verification application to clear
     * @returns the cleared verification application
     */
    public async clearApplication(userId: string, verificationApplicationId: string) {
        const kyc = await S3Client.getAcuantKyc(userId);
        if (kyc) await S3Client.deleteAcuantKyc(userId);
        this.prismaService.verificationApplication.delete({ where: { id: verificationApplicationId } });
        return generateFactorsFromKYC(kyc);
    }
}
