import { PlatformTest } from "@tsed/common";
import SuperTest from "supertest";
import { RestServer } from "../../../../RestServer";

import { handleBaseAssertions, resetAdminPasswordRoute } from "../../../test_helper";
import * as authControllers from "../../../../controllers/v1/AuthenticationController";

import { VerificationService } from "../../../../services/VerificationService";

import * as bodyParser from "body-parser";

import { Verification } from "../../../../models/Verification";
import { Firebase } from "../../../../clients/firebase";

import Supertest from "supertest";
import { auth } from "firebase-admin";

const setEnv = () => {
    process.env.NODE_ENV = "production";
};

describe(" register user", () => {
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
        await PlatformTest.bootstrap(RestServer, {
            mount: {
                "/v1": [...Object.values(authControllers)],
            },
            acceptMimes: ["application/json"],
            middlewares: [
                {
                    hook: "$beforeRoutesInit",
                    use: bodyParser.json(),
                },
                {
                    hook: "$beforeRoutesInit",
                    use: bodyParser.urlencoded({ extended: true }),
                },
            ],
        })();
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
        const getUserByEmailSpy = jest.spyOn(Firebase, "getUserByEmail").mockResolvedValue(firebaseUser);
        const udpateUserPasswordSpy = jest.spyOn(Firebase, "updateUserPassword").mockResolvedValue(firebaseUser);
        const res = await request.put(resetAdminPasswordRoute).send(body);
        console.log(res.body);

        handleBaseAssertions(res, 200, null, verifyCodeSpy, getUserByEmailSpy, udpateUserPasswordSpy);
    });
});
