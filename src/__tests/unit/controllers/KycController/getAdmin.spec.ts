import { PlatformTest } from "@tsed/common";
import { RestServer } from "../../../../RestServer";
import SuperTest from "supertest";
import { handleBaseAssertions } from "../../../test_helper";
import { SessionService } from "../../../../services/SessionService";
import { UserService } from "../../../../services/UserService";
import { USER_NOT_FOUND } from "../../../../util/errors";
import { User, VerificationApplication } from "@prisma/client";
import { KycStatus } from "../../../../util/constants";
import { VerificationApplicationService } from "../../../../services/VerificationApplicationService";
import { AdminService } from "../../../../services/AdminService";
import { KycUser } from "../../../../../types";

describe("Get Admin ", () => {
    let request: SuperTest.SuperTest<SuperTest.Test>;
    let sessionService: SessionService;
    let userService: UserService;
    let verificationApplicationService: VerificationApplicationService;
    let adminService: AdminService;

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

    const kycUser: KycUser = {
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

    beforeAll(async () => {
        await PlatformTest.bootstrap(RestServer)();
    });

    beforeAll(async () => {
        request = SuperTest(PlatformTest.callback());
        sessionService = PlatformTest.get<SessionService>(SessionService);
        userService = PlatformTest.get(UserService);
        verificationApplicationService = PlatformTest.get(VerificationApplicationService);
        adminService = PlatformTest.get(AdminService);
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
        const checkPermissionsSpy = jest
            .spyOn(adminService, "checkPermissions")
            .mockResolvedValue({ role: "role", company: "raiinmaker", email: "me@raiinmaker.com", orgId: "id" });
        const findUserByIdSpy = jest.spyOn(userService, "findUserById").mockResolvedValue(null);
        const res = await request.get("/v1/kyc/admin/1234").set("Authorization", "token");
        handleBaseAssertions(res, 404, USER_NOT_FOUND, checkPermissionsSpy, findUserByIdSpy);
    });

    it("should get Admin by Id", async () => {
        const checkPermissionsSpy = jest
            .spyOn(adminService, "checkPermissions")
            .mockResolvedValue({ role: "role", company: "raiinmaker", email: "me@raiinmaker.com", orgId: "id" });
        const findUserByIdSpy = jest.spyOn(userService, "findUserById").mockResolvedValue(user);
        const getRawApplicationSpy = jest
            .spyOn(verificationApplicationService, "getRawApplication")
            .mockResolvedValue(kycUser);
        const res = await request.get("/v1/kyc/admin/1234").set("Authorization", "token");
        handleBaseAssertions(res, 200, null, checkPermissionsSpy, findUserByIdSpy, getRawApplicationSpy);
    });
});
