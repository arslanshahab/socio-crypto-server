import { PlatformTest } from "@tsed/common";
import { RestServer } from "../../../../RestServer";
import SuperTest from "supertest";
import { FirebaseAdmin, FirebaseUserLoginResponse } from "../../../../clients/firebaseAdmin";

import { adminLoginRoute, handleBaseAssertions } from "../../../test_helper";
import { ADMIN_NOT_FOUND } from "../../../../util/errors";
import { AdminService } from "../../../../services/AdminService";
import { Admin } from "@prisma/client";

describe("Admin login", () => {
    let request: SuperTest.SuperTest<SuperTest.Test>;
    let adminService: AdminService;
    const firebaseUser = (hasClaim: boolean, hasTempPass: boolean) => {
        return {
            uid: "id",
            emailVerified: true,
            disabled: false,
            metadata: {
                lastSignInTime: "",
                creationTime: "",
                toJSON: () => Object,
            },
            providerData: [],
            toJSON: () => Object,
            customClaims: hasClaim
                ? {
                      tempPass: hasTempPass ? true : false,
                  }
                : undefined,
        };
    };

    const decodedToken = (isExpired: boolean) => {
        return {
            auth_time: isExpired ? 1000 : new Date().getTime() / 1000,
            aud: "",
            exp: 3,
            firebase: {
                key: "",
                identities: {
                    key: "",
                },
                sign_in_provider: "string",
                sign_in_second_factor: undefined,
                second_factor_identifier: undefined,
                tenant: undefined,
            },
            iat: 3,
            iss: "",
            sub: "",
            uid: "",
        };
    };

    const firebaseUserLoginResponse: FirebaseUserLoginResponse = {
        kind: "kind",
        localId: "id",
        email: "email@raiinmaker.com",
        displayName: "name",
        idToken: "token",
        registered: true,
        refreshToken: "refreshToken",
        expiresIn: "hour",
    };

    const admin: Admin & {} = {
        id: "id",
        firebaseId: "firebaseId",
        userId: "userId",
        orgId: "orgId",
        name: "name",
        createdAt: new Date(),
        updatedAt: new Date(),
        twoFactorEnabled: true,
    };

    beforeAll(async () => {
        await PlatformTest.bootstrap(RestServer)();
    });

    beforeAll(async () => {
        request = SuperTest(PlatformTest.callback());
        adminService = PlatformTest.get<AdminService>(AdminService);
    });

    beforeEach(() => {
        jest.clearAllMocks();
    });

    afterAll(async () => {
        await PlatformTest.reset();
    });

    it("should throw ADMIN_NOT_FOUND ", async () => {
        const body = { email: "me@raiinmaker.com", password: "password" };
        const loginUserSpy = jest.spyOn(FirebaseAdmin, "loginUser").mockResolvedValue(firebaseUserLoginResponse);
        const verifyTokenSpy = jest.spyOn(FirebaseAdmin, "verifyToken").mockResolvedValue(decodedToken(false));
        const getUserByIdSpy = jest.spyOn(FirebaseAdmin, "getUserById").mockResolvedValue(firebaseUser(false, false));

        const res = await request.post(adminLoginRoute).send(body);

        handleBaseAssertions(res, 401, ADMIN_NOT_FOUND, loginUserSpy, verifyTokenSpy, getUserByIdSpy);
    });

    it("should login amdin when tempPass is true", async () => {
        const body = { email: "me@raiinmaker.com", password: "password" };
        const loginUserSpy = jest.spyOn(FirebaseAdmin, "loginUser").mockResolvedValue(firebaseUserLoginResponse);
        const verifyTokenSpy = jest.spyOn(FirebaseAdmin, "verifyToken").mockResolvedValue(decodedToken(false));
        const getUserByIdSpy = jest.spyOn(FirebaseAdmin, "getUserById").mockResolvedValue(firebaseUser(true, true));

        const res = await request.post(adminLoginRoute).send(body);
        console.log(res.body);

        handleBaseAssertions(res, 200, null, loginUserSpy, verifyTokenSpy, getUserByIdSpy);
    });

    it("should throw Unauthorised on expired session", async () => {
        const body = { email: "me@raiinmaker.com", password: "password" };
        const loginUserSpy = jest.spyOn(FirebaseAdmin, "loginUser").mockResolvedValue(firebaseUserLoginResponse);
        const verifyTokenSpy = jest.spyOn(FirebaseAdmin, "verifyToken").mockResolvedValue(decodedToken(true));
        const getUserByIdSpy = jest.spyOn(FirebaseAdmin, "getUserById").mockResolvedValue(firebaseUser(true, false));

        const res = await request.post(adminLoginRoute).send(body);
        console.log(res.body);

        handleBaseAssertions(res, 401, null, loginUserSpy, verifyTokenSpy, getUserByIdSpy);
    });

    it("should successfully login admin", async () => {
        const body = { email: "me@raiinmaker.com", password: "password" };
        const loginUserSpy = jest.spyOn(FirebaseAdmin, "loginUser").mockResolvedValue(firebaseUserLoginResponse);
        const verifyTokenSpy = jest.spyOn(FirebaseAdmin, "verifyToken").mockResolvedValue(decodedToken(false));
        const getUserByIdSpy = jest.spyOn(FirebaseAdmin, "getUserById").mockResolvedValue(firebaseUser(true, false));
        const createSessionCokieSpy = jest.spyOn(FirebaseAdmin, "createSessionCookie").mockResolvedValue("session");
        const findAdminByFirebaseIdSpy = jest.spyOn(adminService, "findAdminByFirebaseId").mockResolvedValue(admin);
        const res = await request.post(adminLoginRoute).send(body);
        console.log(res.body);

        handleBaseAssertions(
            res,
            200,
            null,
            loginUserSpy,
            verifyTokenSpy,
            getUserByIdSpy,
            findAdminByFirebaseIdSpy,
            createSessionCokieSpy
        );
    });
});
