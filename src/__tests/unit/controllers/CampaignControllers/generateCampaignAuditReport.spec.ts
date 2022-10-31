import { PlatformTest } from "@tsed/common";
import { RestServer } from "../../../../RestServer";
import SuperTest from "supertest";

import { generateCampaignAuditReportRoute, handleBaseAssertions } from "../../../test_helper";
import { CAMPAIGN_NOT_FOUND } from "../../../../util/errors";
import { AdminService } from "../../../../services/AdminService";
import { Campaign, Participant } from "@prisma/client";
import { CampaignService } from "../../../../services/CampaignService";
import { CampaignIdModel } from "../../../../models/RestModels";
import { SessionService } from "../../../../services/SessionService";
import { SocialPostService } from "../../../../services/SocialPostService";
import * as helpers from "../../../../controllers/helpers";

describe("Campaign Audit Report ", () => {
    let request: SuperTest.SuperTest<SuperTest.Test>;
    let adminService: AdminService;
    let campaignService: CampaignService;
    let sessionService: SessionService;
    let socialPostService: SocialPostService;

    const participant: Participant = {
        id: "id",
        clickCount: "count",
        campaignId: "id",
        viewCount: "view count",
        submissionCount: "submission count",
        participationScore: "score",
        link: "link",
        createdAt: new Date(),
        updatedAt: new Date(),
        userId: "userId",
        email: "raiinmaker.com",
        blacklist: false,
    };

    const campaign: Campaign & { participant: Participant[] } = {
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
        type: "coiin",
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
        participant: [participant],
    };

    beforeAll(async () => {
        await PlatformTest.bootstrap(RestServer)();
    });

    beforeAll(async () => {
        request = SuperTest(PlatformTest.callback());
        adminService = PlatformTest.get<AdminService>(AdminService);
        campaignService = PlatformTest.get(CampaignService);
        sessionService = PlatformTest.get(SessionService);
        socialPostService = PlatformTest.get<SocialPostService>(SocialPostService);
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

    it("should throw CAMPAIGN_NOT_FOUND ", async () => {
        const query: CampaignIdModel = {
            campaignId: "id",
        };
        const checkPermissionsSpy = jest.spyOn(adminService, "checkPermissions").mockResolvedValue({});
        const findCampaignByIdSpy = jest.spyOn(campaignService, "findCampaignById").mockResolvedValue(null);
        const res = await request.post(generateCampaignAuditReportRoute).set("Authorization", "token").query(query);

        handleBaseAssertions(res, 404, CAMPAIGN_NOT_FOUND, checkPermissionsSpy, findCampaignByIdSpy);
    });

    it("should generate campaign audit report", async () => {
        const query: CampaignIdModel = {
            campaignId: "id",
        };
        const checkPermissionsSpy = jest.spyOn(adminService, "checkPermissions").mockResolvedValue({});
        const findCampaignByIdSpy = jest.spyOn(campaignService, "findCampaignById").mockResolvedValue(campaign);
        const currentCampaignTierSpy = jest
            .spyOn(campaignService, "currentCampaignTier")
            .mockResolvedValue({ currentTier: 20, currentTotal: 20 });
        const findSocialPostByParticipantIdSpy = jest
            .spyOn(socialPostService, "findSocialPostByParticipantId")
            .mockResolvedValue([]);
        const calculateParticipantSocialScoreV2Spy = jest
            .spyOn(helpers, "calculateParticipantSocialScoreV2")
            .mockResolvedValue({ totalLikes: 2, totalShares: 3, likesScore: 30, shareScore: 30 });
        const calculateParticipantPayoutV2Spy = jest
            .spyOn(helpers, "calculateParticipantPayoutV2")
            .mockResolvedValue(3);

        const res = await request.post(generateCampaignAuditReportRoute).set("Authorization", "token").query(query);

        handleBaseAssertions(
            res,
            200,
            null,
            checkPermissionsSpy,
            findCampaignByIdSpy,
            currentCampaignTierSpy,
            findSocialPostByParticipantIdSpy,
            calculateParticipantPayoutV2Spy,
            calculateParticipantSocialScoreV2Spy
        );
    });
});
