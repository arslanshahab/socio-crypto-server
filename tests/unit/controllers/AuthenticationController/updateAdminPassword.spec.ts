import { PlatformTest } from "@tsed/common";
import { RestServer } from "../../../../src/RestServer";
import * as authControllers from "../../../../src/controllers/v1/AuthenticationController";
import * as bodyParser from "body-parser";
import { Firebase } from "../../.././../src/clients/firebase";

import { handleBaseAssertions, updateAdminPasswordRoute } from "../../../test_helper";

import SuperTest from "supertest";
import { auth } from "firebase-admin";

describe("Update admin password", () => {
    let request: SuperTest.SuperTest<SuperTest.Test>;

    const firebaseUser = (hasClaims: boolean) => {
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
            customClaims: hasClaims ? {} : undefined,
        };
    };

    const decodedToken: auth.DecodedIdToken = {
        auth_time: 2,
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

    beforeAll(async () => {
        await PlatformTest.bootstrap(RestServer, {
            mount: {
                "/v1": [...Object.values(authControllers)],
            },
            cache: undefined,
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

    beforeAll(async () => {
        request = SuperTest(PlatformTest.callback());
    });

    beforeEach(() => {
        jest.clearAllMocks();
    });

    afterAll(async () => {
        await PlatformTest.reset();
    });

    it("should throw unauthorised", async () => {
        const body = { idToken: "token", password: "password" };
        const verifyTokenSpy = jest.spyOn(Firebase, "verifyToken").mockResolvedValue(decodedToken);
        const getUserByIdSpy = jest.spyOn(Firebase, "getUserById").mockResolvedValue(firebaseUser(false));

        const res = await request.put(updateAdminPasswordRoute).send(body);
        console.log(res.body);
        console.log(res.status);

        handleBaseAssertions(res, 401, "Unauthorized", verifyTokenSpy, getUserByIdSpy);
    });

    it("should successfully update admin password", async () => {
        const body = { idToken: "token", password: "password" };
        const verifyTokenSpy = jest.spyOn(Firebase, "verifyToken").mockResolvedValue(decodedToken);
        const getUserByIdSpy = jest.spyOn(Firebase, "getUserById").mockResolvedValue(firebaseUser(true));
        jest.spyOn(Firebase, "updateUserPassword").mockResolvedValue(firebaseUser(true));
        jest.spyOn(Firebase, "setCustomUserClaims").mockImplementation(
            async (uid: string, orgName: string, role: "manager" | "admin", tempPass: boolean) => {}
        );
        const res = await request.put(updateAdminPasswordRoute).send(body);
        console.log(res.body);
        handleBaseAssertions(res, 200, null, verifyTokenSpy, getUserByIdSpy);
    });
});
