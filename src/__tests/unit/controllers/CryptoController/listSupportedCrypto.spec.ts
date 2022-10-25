import { PlatformTest } from "@tsed/common";
import { RestServer } from "../../../../RestServer";
import { AuthenticationController } from "../../../../controllers/v1/AuthenticationController";
import * as bodyParser from "body-parser";
import SuperTest from "supertest";

import { handleBaseAssertions, listSupportedCryptoRoute } from "../../../test_helper";
import { SessionService } from "../../../../services/SessionService";
import { AdminService } from "../../../../services/AdminService";
import { CryptoCurrencyService } from "../../../../services/CryptoCurrencyService";

describe("List supported Crypto", () => {
    let request: SuperTest.SuperTest<SuperTest.Test>;
    let sessionService: SessionService;
    let adminService: AdminService;
    let cryptoCurrencyService: CryptoCurrencyService;


    beforeAll(async () => {
        await PlatformTest.bootstrap(RestServer, {
            mount: {
                "/v1": [AuthenticationController],
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
        sessionService = PlatformTest.get<SessionService>(SessionService);
        adminService = PlatformTest.get<AdminService>(AdminService);
        cryptoCurrencyService = PlatformTest.get(CryptoCurrencyService)

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

    it("should get all supported crypto currencies", async () => {
        const checkPermissionsSpy = jest.spyOn(adminService, "checkPermissions").mockResolvedValue({ role: "role", company: "raiinmaker", orgId: "id", email: "me@raiinmaker.com" });
        const findCryptoCurrenciesSpy = jest.spyOn(cryptoCurrencyService, "findCryptoCurrencies").mockResolvedValue([]);
        const res = await request.get(listSupportedCryptoRoute).set("Authorization", "token");
        handleBaseAssertions(res, 200, null, checkPermissionsSpy, findCryptoCurrenciesSpy);
    });
});
