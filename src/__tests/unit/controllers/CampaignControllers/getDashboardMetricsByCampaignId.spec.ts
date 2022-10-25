import { PlatformTest } from "@tsed/common";
import { RestServer } from "../../../../RestServer";
import SuperTest from "supertest";
import { handleBaseAssertions } from "../../../test_helper";
import { SessionService } from "../../../../services/SessionService";
import { CampaignService } from "../../../../services/CampaignService";
import { AdminService } from "../../../../services/AdminService";
import { ParticipantService } from "../../../../services/ParticipantService";
import { DailyParticipantMetricService } from "../../../../services/DailyParticipantMetricService";
import { ADMIN_NOT_FOUND } from "../../../../util/errors";
import { Admin } from "@prisma/client";
import { AggregatedCampaignMetricType } from "../../../../../types";

describe("Dashboard Metrics By CampaignId", () => {
    let request: SuperTest.SuperTest<SuperTest.Test>;
    let sessionService: SessionService;
    let adminService: AdminService;
    let campaignService: CampaignService;

    let participantService: ParticipantService;
    let dailyParticipantMetricService: DailyParticipantMetricService;

    const admin: Admin & {} = {
        id: "id",
        firebaseId: "firebaseId",
        userId: "userId",
        orgId: "orgId",
        name: "admin name",
        createdAt: new Date(),
        updatedAt: new Date(),
        twoFactorEnabled: true,
    };

    const aggregatedMetrics: AggregatedCampaignMetricType = {
        clickCount: 3,
        viewCount: 3,
        shareCount: 3,
        participationScore: 2,
    };

    beforeAll(async () => {
        await PlatformTest.bootstrap(RestServer)();
    });

    beforeAll(async () => {
        request = SuperTest(PlatformTest.callback());
        sessionService = PlatformTest.get<SessionService>(SessionService);
        adminService = PlatformTest.get<AdminService>(AdminService);
        campaignService = PlatformTest.get(CampaignService);

        participantService = PlatformTest.get<ParticipantService>(ParticipantService);
        dailyParticipantMetricService = PlatformTest.get(DailyParticipantMetricService);

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

    it("should throw ADMIN_NOT_FOUND", async () => {
        const findAdminByFirebaseIdSpy = jest.spyOn(adminService, "findAdminByFirebaseId").mockResolvedValue(null);

        const res = await request.get("/v1/campaign/dashboard-metrics/1234").set("Authorization", "token");

        console.log(res.body);

        handleBaseAssertions(res, 404, ADMIN_NOT_FOUND, findAdminByFirebaseIdSpy);
    });

    it("should get metrics for id -1", async () => {
        const findAdminByFirebaseIdSpy = jest.spyOn(adminService, "findAdminByFirebaseId").mockResolvedValue(admin);
        const getAggregatedOrgMetricsSpy = jest
            .spyOn(dailyParticipantMetricService, "getAggregatedOrgMetrics")
            .mockResolvedValue([]);
        const getOrgMetricsSpy = jest.spyOn(dailyParticipantMetricService, "getOrgMetrics").mockResolvedValue([]);
        const findCampaignsSpy = jest
            .spyOn(campaignService, "findCampaigns")
            .mockResolvedValue([{ id: "id", name: "name" }]);
        const findParticipantsCountSpy = jest.spyOn(participantService, "findParticipantsCount").mockResolvedValue(3);

        const res = await request.get("/v1/campaign/dashboard-metrics/-1").set("Authorization", "token");

        console.log(res.body);

        handleBaseAssertions(
            res,
            200,
            null,
            findAdminByFirebaseIdSpy,
            getAggregatedOrgMetricsSpy,
            getOrgMetricsSpy,
            findCampaignsSpy,
            findParticipantsCountSpy
        );
    });

    it("should get metrics for id != -1", async () => {
        const findAdminByFirebaseIdSpy = jest.spyOn(adminService, "findAdminByFirebaseId").mockResolvedValue(admin);

        const getAggregatedCampaignMetricsSpy = jest
            .spyOn(dailyParticipantMetricService, "getAggregatedCampaignMetrics")
            .mockResolvedValue([aggregatedMetrics]);
        const getCampaignMetricsSpy = jest
            .spyOn(dailyParticipantMetricService, "getCampaignMetrics")
            .mockResolvedValue([]);
        const findParticipantsCountSpy = jest.spyOn(participantService, "findParticipantsCount").mockResolvedValue(3);
        const res = await request.get("/v1/campaign/dashboard-metrics/3").set("Authorization", "token");

        console.log(res.body);

        handleBaseAssertions(
            res,
            200,
            null,
            findAdminByFirebaseIdSpy,
            getAggregatedCampaignMetricsSpy,
            getCampaignMetricsSpy,
            findParticipantsCountSpy
        );
    });
});
