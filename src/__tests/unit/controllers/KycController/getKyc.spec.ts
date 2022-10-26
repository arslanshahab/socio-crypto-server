import { PlatformTest } from "@tsed/common";
import { RestServer } from "../../../../RestServer";
import SuperTest from "supertest";
import { handleBaseAssertions, kycRoute } from "../../../test_helper";
import { SessionService } from "../../../../services/SessionService";
import { UserService } from "../../../../services/UserService";
import { KYC_NOT_FOUND, USER_NOT_FOUND } from "../../../../util/errors";
import { User, VerificationApplication } from "@prisma/client";
import { KycStatus } from "../../../../util/constants";
import { VerificationApplicationService } from "../../../../services/VerificationApplicationService";

describe("Get Kyc ", () => {
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
        status: "APPROVED",
        userId: "userId",
        createdAt: new Date(),
        updatedAt: new Date(),
        reason: "reason",
        id: "id",
        level: "LEVEL1",
        profile: "profile",
        adminId: "adminId",
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

    it("should throw USRE_NOT_FOUND", async () => {
        const findUserByContextSpy = jest.spyOn(userService, "findUserByContext").mockResolvedValue(null);
        const res = await request.get(kycRoute).set("Authorization", "token");
        handleBaseAssertions(res, 400, USER_NOT_FOUND, findUserByContextSpy);
    });

    it("should throw KYC_NOT_FOUND", async () => {
        const findUserByContextSpy = jest.spyOn(userService, "findUserByContext").mockResolvedValue(user);
        const getApplicationSpy = jest.spyOn(verificationApplicationService, "getApplication").mockResolvedValue(null);

        const res = await request.get(kycRoute).set("Authorization", "token");
        handleBaseAssertions(res, 400, KYC_NOT_FOUND, findUserByContextSpy, getApplicationSpy);
    });

    it("should get kyc", async () => {
        const findUserByContextSpy = jest.spyOn(userService, "findUserByContext").mockResolvedValue(user);
        const getApplicationSpy = jest
            .spyOn(verificationApplicationService, "getApplication")
            .mockResolvedValue({ kyc: verificationApp });

        const res = await request.get(kycRoute).set("Authorization", "token");
        console.log(res.body);

        handleBaseAssertions(res, 200, null, findUserByContextSpy, getApplicationSpy);
    });
});
