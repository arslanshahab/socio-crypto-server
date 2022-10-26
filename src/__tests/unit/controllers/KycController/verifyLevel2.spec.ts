import { PlatformTest } from "@tsed/common";
import { RestServer } from "../../../../RestServer";
import SuperTest from "supertest";
import { handleBaseAssertions, kycVerifyLevelRoute2 } from "../../../test_helper";
import { SessionService } from "../../../../services/SessionService";
import { UserService } from "../../../../services/UserService";
import { KYC_LEVEL_1_NOT_APPROVED, USER_NOT_FOUND } from "../../../../util/errors";
import { KycStatus } from "../../../../util/constants";
import { VerificationApplicationService } from "../../../../services/VerificationApplicationService";
import { User, VerificationApplication } from "@prisma/client";
import { KycApplication } from "../../../../../types";
import { KycLevel2Params } from "../../../../controllers/v1/KycController";

describe("Verify level2 ", () => {
    let request: SuperTest.SuperTest<SuperTest.Test>;
    let sessionService: SessionService;
    let userService: UserService;
    let verificationApplicationService: VerificationApplicationService;

    const body: KycLevel2Params = {
        documentType: "type",
        documentCountry: "country",
        frontDocumentImage: "image-url",
        faceImage: "faceImage-url",
        backDocumentImage: "backDoc-image",
    };
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

    const kycApplication: KycApplication = {};

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
        const res = await request.post(kycVerifyLevelRoute2).set("Authorization", "token").send(body);

        handleBaseAssertions(res, 400, USER_NOT_FOUND, findUserByContextSpy);
    });

    it("should throw KYC_LEVEL_1_NOT_APPROVED", async () => {
        const findUserByContextSpy = jest.spyOn(userService, "findUserByContext").mockResolvedValue(user);
        const isLevel1ApprovedSpy = jest
            .spyOn(verificationApplicationService, "isLevel1Approved")
            .mockResolvedValue(false);
        const res = await request.post(kycVerifyLevelRoute2).set("Authorization", "token").send(body);
        handleBaseAssertions(res, 400, KYC_LEVEL_1_NOT_APPROVED, findUserByContextSpy, isLevel1ApprovedSpy);
    });

    it("should verify level 2", async () => {
        const findUserByContextSpy = jest.spyOn(userService, "findUserByContext").mockResolvedValue(user);
        const isLevel1ApprovedSpy = jest
            .spyOn(verificationApplicationService, "isLevel1Approved")
            .mockResolvedValue(true);
        const getProfileDataSpy = jest
            .spyOn(verificationApplicationService, "getProfileData")
            .mockResolvedValue(kycApplication);
        const registerKycSpy = jest
            .spyOn(verificationApplicationService, "registerKyc")
            .mockResolvedValue({ kycId: "kycId", status: "status" });
        const res = await request.post(kycVerifyLevelRoute2).set("Authorization", "token").send(body);
        handleBaseAssertions(
            res,
            200,
            null,
            findUserByContextSpy,
            registerKycSpy,
            isLevel1ApprovedSpy,
            getProfileDataSpy
        );
    });
});
