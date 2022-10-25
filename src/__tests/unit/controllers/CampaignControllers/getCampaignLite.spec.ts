import { PlatformTest } from "@tsed/common";
import { RestServer } from "../../../../RestServer";
import SuperTest from "supertest";

import { campaignsLiteRoute, handleBaseAssertions } from "../../../test_helper";
import { SessionService } from "../../../../services/SessionService";

import { CampaignIdModel } from "../../../../models/RestModels";

import { AdminService } from "../../../../services/AdminService";

import { CampaignService } from "../../../../services/CampaignService";

describe("Campaign Lite", () => {
    let request: SuperTest.SuperTest<SuperTest.Test>;
    let sessionService: SessionService;
    let adminService: AdminService;
    let campaignService: CampaignService;

    beforeAll(async () => {
        await PlatformTest.bootstrap(RestServer)();
    });

    beforeAll(async () => {
        request = SuperTest(PlatformTest.callback());
        sessionService = PlatformTest.get<SessionService>(SessionService);
        adminService = PlatformTest.get<AdminService>(AdminService);
        campaignService = PlatformTest.get<CampaignService>(CampaignService);

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

    it("should get campaigns lite", async () => {
        const query: CampaignIdModel = {
            campaignId: "id",
        };
        const checkPermissionsSpy = jest.spyOn(adminService, "checkPermissions").mockResolvedValue({});
        const findCampaignsSpy = jest.spyOn(campaignService, "findCampaigns").mockResolvedValue([]);

        const res = await request.get(campaignsLiteRoute).set("Authorization", "token").query(query);

        handleBaseAssertions(res, 200, null, checkPermissionsSpy, findCampaignsSpy);
    });
});
