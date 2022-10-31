import { PlatformTest } from "@tsed/common";
import { RestServer } from "../../../../RestServer";
import SuperTest from "supertest";
import { handleBaseAssertions, updateKycRoute } from "../../../test_helper";
import { SessionService } from "../../../../services/SessionService";
import { UserService } from "../../../../services/UserService";
import { USER_NOT_FOUND } from "../../../../util/errors";
import { KycStatus } from "../../../../util/constants";
import { User, VerificationApplication } from "@prisma/client";
import { KycUser } from "../../../../../types";
import { S3Client } from "../../../../clients/s3";

describe("Update kyc", () => {
    let request: SuperTest.SuperTest<SuperTest.Test>;
    let sessionService: SessionService;
    let userService: UserService;

    const body: KycUser = {
        firstName: "firstName",
        lastName: "lastName",
        address: {
            country: "country",
            address1: "address 1",
            address2: "address 2",
            city: "city",
            state: "state",
            zip: "zip",
        },
        businessName: "business name",
        phoneNumber: "phone number",
        email: "email",
        paypalEmail: "paypalEmail",
        idProof: "idProof",
        addressProof: "addressProof",
        exceptions: "exceptions",
        typeOfStructure: "type of structure",
        accountNumbers: "account numbers",
        ssn: "ssn",
        hasIdProof: true,
        hasAddressProof: true,
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
        const res = await request.put(updateKycRoute).set("Authorization", "token").send(body);

        handleBaseAssertions(res, 400, USER_NOT_FOUND, findUserByContextSpy);
    });

    it("should update kyc", async () => {
        const findUserByContextSpy = jest.spyOn(userService, "findUserByContext").mockResolvedValue(user);
        const uploadKycImageSpy = jest
            .spyOn(S3Client, "uploadKycImage")
            .mockImplementation(async (userId, type, image) => {});
        const updateUserInfoSpy = jest.spyOn(S3Client, "updateUserInfo").mockResolvedValue({});
        const res = await request.put(updateKycRoute).set("Authorization", "token").send(body);
        handleBaseAssertions(res, 200, null, findUserByContextSpy, uploadKycImageSpy, updateUserInfoSpy);
    });
});
