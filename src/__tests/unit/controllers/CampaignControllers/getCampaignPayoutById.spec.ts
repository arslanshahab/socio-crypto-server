import { PlatformTest } from "@tsed/common";
import { RestServer } from "../../../../RestServer";
import { AuthenticationController } from "../../../../controllers/v1/AuthenticationController";
import * as bodyParser from "body-parser";
import SuperTest from "supertest";

import { campaignPayoutIdRoute, handleBaseAssertions } from "../../../test_helper";
import { SessionService } from "../../../../services/SessionService";

import { CampaignIdModel } from "../../../../models/RestModels";

import { AdminService } from "../../../../services/AdminService";
import { TransferService } from "../../../../services/TransferService";

describe("Campaign Payout", () => {
    let request: SuperTest.SuperTest<SuperTest.Test>;
    let sessionService: SessionService;
    let adminService: AdminService;
    let transferService: TransferService;

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
        transferService = PlatformTest.get<TransferService>(TransferService);

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

    it("should get campaign payout with id", async () => {
        const query: CampaignIdModel = {
            campaignId: "id",
        };
        const checkPermissionsSpy = jest.spyOn(adminService, "checkPermissions").mockResolvedValue({});
        const findTransferByCampaignIdAndActionSpy = jest
            .spyOn(transferService, "findTransferByCampaignIdAndAction")
            .mockResolvedValue([]);
        const res = await request
            .get(campaignPayoutIdRoute + "1234")
            .set("Authorization", "token")
            .query(query);

        handleBaseAssertions(res, 200, null, checkPermissionsSpy, findTransferByCampaignIdAndActionSpy);
    });
});
