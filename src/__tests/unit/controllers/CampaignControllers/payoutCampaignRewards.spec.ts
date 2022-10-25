import { PlatformTest } from "@tsed/common";
import { RestServer } from "../../../../RestServer";
import SuperTest from "supertest";

import { handleBaseAssertions, payoutCampaignRewardsRoute } from "../../../test_helper";
import { SessionService } from "../../../../services/SessionService";

import { AdminService } from "../../../../services/AdminService";

import { PayoutCampaignRewardsParams } from "../../../../controllers/v1/CampaignController";
import { CampaignService } from "../../../../services/CampaignService";
import { CAMPAIGN_NOT_FOUND } from "../../../../util/errors";
import { Campaign } from "@prisma/client";

describe("Payout Campaign Rewards", () => {
    let request: SuperTest.SuperTest<SuperTest.Test>;
    let sessionService: SessionService;
    let adminService: AdminService;
    let campaignService: CampaignService;

    const campaign: Campaign = {
        beginDate: new Date(),
        endDate: new Date(),
        coiinTotal: "total",
        target: "target",
        description: "description",
        name: "name",
        id: "id",
        company: "company",
        totalParticipationScore: "score",
        algorithm: "algorithm",
        audited: true,
        targetVideo: "target video",
        imagePath: "image",
        tagline: "line",
        suggestedPosts: "posts",
        suggestedTags: "tags",
        createdAt: new Date(),
        updatedAt: new Date(),
        requirements: "requirements",
        orgId: "id",
        type: "type",
        status: "status",
        cryptoId: "id",
        keywords: "keywords",
        campaignType: "type",
        socialMediaType: "type",
        instructions: "instructions",
        tatumBlockageId: "tatum",
        symbol: "symbol",
        auditStatus: "status",
        isGlobal: true,
        showUrl: true,
        currencyId: "id",
    };

    beforeAll(async () => {
        await PlatformTest.bootstrap(RestServer)();
    });

    beforeAll(async () => {
        request = SuperTest(PlatformTest.callback());
        adminService = PlatformTest.get<AdminService>(AdminService);
        sessionService = PlatformTest.get<SessionService>(SessionService);
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

    it("should throw CAMPAIGN_NOT_FOUND", async () => {
        const query: PayoutCampaignRewardsParams = {
            campaignId: "id",
            rejected: [],
        };

        const checkPermissionSpy = jest.spyOn(adminService, "checkPermissions").mockResolvedValue({});
        const findCampaignByIdSpy = jest.spyOn(campaignService, "findCampaignById").mockResolvedValue(null);

        const res = await request.post(payoutCampaignRewardsRoute).set("Authorization", "token").query(query);
        handleBaseAssertions(res, 404, CAMPAIGN_NOT_FOUND, checkPermissionSpy, findCampaignByIdSpy);
    });

    it("should payout campaign rewards", async () => {
        const query: PayoutCampaignRewardsParams = {
            campaignId: "id",
            rejected: [],
        };

        const checkPermissionSpy = jest.spyOn(adminService, "checkPermissions").mockResolvedValue({});
        const findCampaignByIdSpy = jest.spyOn(campaignService, "findCampaignById").mockResolvedValue(campaign);
        const updateCampaignStatusSpy = jest.spyOn(campaignService, "updateCampaignStatus").mockResolvedValue(campaign);

        const res = await request.post(payoutCampaignRewardsRoute).set("Authorization", "token").query(query);
        handleBaseAssertions(res, 200, null, checkPermissionSpy, findCampaignByIdSpy, updateCampaignStatusSpy);
    });
});
