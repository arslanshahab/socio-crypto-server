import { PlatformTest } from "@tsed/common";
import { RestServer } from "../../../../RestServer";
import SuperTest from "supertest";
import { handleBaseAssertions, kycVerifyLevelRoute1 } from "../../../test_helper";
import { SessionService } from "../../../../services/SessionService";
import { UserService } from "../../../../services/UserService";
import { USER_NOT_FOUND } from "../../../../util/errors";
import { KycLevel1Params } from "../../../../controllers/v1/KycController";
import { KycStatus } from "../../../../util/constants";
import { VerificationApplicationService } from "../../../../services/VerificationApplicationService";
import { User, VerificationApplication } from "@prisma/client";

describe("Verify level1 ", () => {
    let request: SuperTest.SuperTest<SuperTest.Test>;
    let sessionService: SessionService;
    let userService: UserService;
    let verificationApplicationService: VerificationApplicationService;

    const body: KycLevel1Params = {
        firstName: "firstName",
        lastName: "lastName",
        middleName: "middleName",
        phoneNumber: "phone number",
        email: "email",
        billingStreetAddress: "billingSteetAddress",
        billingCity: "billing city",
        billingCountry: "billing country",
        zipCode: "zip code",
        gender: "male",
        dob: "26th oct 2022",
        ip: "2.3.3.3.3",
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
        const res = await request.post(kycVerifyLevelRoute1).set("Authorization", "token").send(body);

        handleBaseAssertions(res, 400, USER_NOT_FOUND, findUserByContextSpy);
    });

    it("should verify level 1", async () => {
        const findUserByContextSpy = jest.spyOn(userService, "findUserByContext").mockResolvedValue(user);
        const registerKycSpy = jest
            .spyOn(verificationApplicationService, "registerKyc")
            .mockResolvedValue({ kycId: "kycId", status: "status" });

        const res = await request.post(kycVerifyLevelRoute1).set("Authorization", "token").send(body);
        handleBaseAssertions(res, 200, null, findUserByContextSpy, registerKycSpy);
    });
});
