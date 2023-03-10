import { PlatformTest } from "@tsed/common";
import SuperTest from "supertest";
import { RestServer } from "../../../../RestServer";

import { handleBaseAssertions, resetAdminPasswordRoute } from "../../../test_helper";

import { VerificationService } from "../../../../services/VerificationService";

import { Verification } from "../../../../models/Verification";
import { FirebaseAdmin } from "../../../../clients/firebaseAdmin";

import Supertest from "supertest";
import { auth } from "firebase-admin";

const setEnv = () => {
    process.env.NODE_ENV = "production";
};

describe(" register admin password", () => {
    let request: Supertest.SuperTest<SuperTest.Test>;

    let verificationService: VerificationService;

    const firebaseUser: auth.UserRecord = {
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
    };

    beforeAll(async () => {
        setEnv();
        await PlatformTest.bootstrap(RestServer)();
    });

    beforeAll(() => {
        request = SuperTest(PlatformTest.callback());
        verificationService = PlatformTest.get<VerificationService>(VerificationService);
    });

    beforeEach(() => {
        jest.clearAllMocks();
    });
    afterAll(async () => {
        await PlatformTest.reset();
    });

    it("should successfully reset admin password", async () => {
        const body = { email: "me@raiinmake.com", password: "password", code: "code" };
        const verifyCodeSpy = jest
            .spyOn(verificationService, "verifyCode")
            .mockImplementation(async (email, code) => new Verification());
        const getUserByEmailSpy = jest.spyOn(FirebaseAdmin, "getUserByEmail").mockResolvedValue(firebaseUser);
        const udpateUserPasswordSpy = jest.spyOn(FirebaseAdmin, "updateUserPassword").mockResolvedValue(firebaseUser);
        const res = await request.put(resetAdminPasswordRoute).send(body);
        console.log(res.body);

        handleBaseAssertions(res, 200, null, verifyCodeSpy, getUserByEmailSpy, udpateUserPasswordSpy);
    });
});
