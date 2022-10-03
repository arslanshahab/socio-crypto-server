import { PlatformTest } from "@tsed/common";
import { handleBaseAssertions, completeVerificationRoute } from "../../../test_helper";

import { RestServer } from "../../../../RestServer";
import * as authControllers from "../../../../controllers/v1/AuthenticationController";
import * as bodyParser from "body-parser";

import SuperTest from "supertest";

import { VerificationService } from "../../../../services/VerificationService";
import { Verification } from "../../../../models/Verification";

describe("Complete Verification", () => {
    let request: any;
    let verificationService: VerificationService;

    beforeAll(async () => {
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

    it("should throw BadRequest on missing params", async () => {
        // missing code
        const body = {
            email: "me@raiinmaker.com",
        };
        const res = await request.post(completeVerificationRoute).send(body);
        handleBaseAssertions(res, 400, null);
    });

    it("should successfully verify email", async () => {
        const body = {
            email: "me@raiinmaker.com",
            code: "code",
        };
        const verifyCodeSpy = jest.spyOn(verificationService, "verifyCode").mockResolvedValue(new Verification());
        const generateTokenSpy = jest.spyOn(verificationService, "generateToken").mockImplementation((id) => "code");

        const res = await request.post(completeVerificationRoute).send(body);
        handleBaseAssertions(res, 200, null, verifyCodeSpy, generateTokenSpy);
    });
});
