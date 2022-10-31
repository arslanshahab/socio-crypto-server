import { PlatformTest } from "@tsed/common";
import { RestServer } from "../../../../RestServer";
import SuperTest from "supertest";
import { handleBaseAssertions, kycDownloadRoute } from "../../../test_helper";
import { SessionService } from "../../../../services/SessionService";
import { UserService } from "../../../../services/UserService";
import { KYC_NOT_FOUND, USER_NOT_FOUND } from "../../../../util/errors";
import { User, VerificationApplication } from "@prisma/client";
import { KycStatus } from "../../../../util/constants";
import { VerificationApplicationService } from "../../../../services/VerificationApplicationService";
// import { User, VerificationApplication } from "@prisma/client";
// import { KycStatus } from "src/util/constants.ts";
import { AcuantApplicationExtractedDetails } from "../../../../../types";

describe("Download Kyc ", () => {
    let request: SuperTest.SuperTest<SuperTest.Test>;
    let sessionService: SessionService;
    let userService: UserService;
    let verificationApplicationService: VerificationApplicationService;

    const user: User & { verification_application: VerificationApplication[] } = {
        active: true,
        createdAt: new Date(),
        updatedAt: new Date(),
        identityId: "id",
        id: "id",
        kycStatus: KycStatus.APPROVED,
        lastLogin: new Date(),
        email: "me@raiinmaker.com",
        password: "password",
        referralCode: "code",
        deletedAt: new Date(),
        promoCode: "code",
        verification_application: [],
    };

    const verificationApp: VerificationApplication = {
        applicationId: "appId",
        status: "PENDING",
        userId: "userId",
        createdAt: new Date(),
        updatedAt: new Date(),
        reason: "reason",
        id: "id",
        level: "LEVEL1",
        profile: "profile",
        adminId: "adminId",
    };

    const accuantApplicationExtractedDetails: AcuantApplicationExtractedDetails = {
        age: 1,
        fullName: "Raiinmaker",
        address: "address",
        isDocumentValid: true,
        documentDetails: "details",
        documentExpiry: new Date(),
    };

    beforeAll(async () => {
        await PlatformTest.bootstrap(RestServer)();
    });

    beforeAll(async () => {
        request = SuperTest(PlatformTest.callback());
        sessionService = PlatformTest.get<SessionService>(SessionService);
        userService = PlatformTest.get(UserService);
        verificationApplicationService = PlatformTest.get(VerificationApplicationService);
        jest.spyOn(sessionService, "verifySession").mockImplementation(async (token) => {
            return { userId: "user" };
        });
    });

    beforeEach(() => {
        jest.clearAllMocks();
    });

    afterAll(async () => {
        await PlatformTest.reset();
    });

    it("should throw USER_NOT_FOUND", async () => {
        const findUserByContextSpy = jest.spyOn(userService, "findUserByContext").mockResolvedValue(null);
        const res = await request.post(kycDownloadRoute).set("Authorization", "token");

        handleBaseAssertions(res, 400, USER_NOT_FOUND, findUserByContextSpy);
    });

    it("should throw KYC_NOT_FOUND", async () => {
        const findUserByContextSpy = jest.spyOn(userService, "findUserByContext").mockResolvedValue(user);
        const findByUserIdAndLevelSpy = jest
            .spyOn(verificationApplicationService, "findByUserIdAndLevel")
            .mockResolvedValue(null);

        const res = await request.post(kycDownloadRoute).set("Authorization", "token");
        handleBaseAssertions(res, 400, KYC_NOT_FOUND, findUserByContextSpy, findByUserIdAndLevelSpy);
    });

    it("should download kyc", async () => {
        const findUserByContextSpy = jest.spyOn(userService, "findUserByContext").mockResolvedValue(user);
        const findByUserIdAndLevelSpy = jest
            .spyOn(verificationApplicationService, "findByUserIdAndLevel")
            .mockResolvedValue(verificationApp);
        jest.spyOn(verificationApplicationService, "clearApplication").mockResolvedValue(
            accuantApplicationExtractedDetails
        );
        const res = await request.post(kycDownloadRoute).set("Authorization", "token");
        handleBaseAssertions(res, 200, null, findUserByContextSpy, findByUserIdAndLevelSpy);
    });
});
