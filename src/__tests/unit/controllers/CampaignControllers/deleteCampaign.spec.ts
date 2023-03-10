import { PlatformTest } from "@tsed/common";
import { RestServer } from "../../../../RestServer";
import SuperTest from "supertest";

import { handleBaseAssertions, deleteCampaignRoute } from "../../../test_helper";
import { SessionService } from "../../../../services/SessionService";

import { CampaignIdModel } from "../../../../models/RestModels";

import { CampaignService } from "../../../../services/CampaignService";
import { AdminService } from "../../../../services/AdminService";
import { SocialPostService } from "../../../../services/SocialPostService";
import { TransferService } from "../../../../services/TransferService";
import { RafflePrizeService } from "../../../../services/RafflePrizeService";
import { EscrowService } from "../../../../services/EscrowService";
import { ParticipantService } from "../../../../services/ParticipantService";
import { DailyParticipantMetricService } from "../../../../services/DailyParticipantMetricService";
import { HourlyCampaignMetricsService } from "../../../../services/HourlyCampaignMetricsService";
import { CampaignTemplateService } from "../../../../services/CampaignTemplateService";
import { CampaignMediaService } from "../../../../services/CampaignMediaService";

describe("Delete Campaign", () => {
    let request: SuperTest.SuperTest<SuperTest.Test>;
    let sessionService: SessionService;
    let adminService: AdminService;
    let campaignService: CampaignService;
    let socialPostService: SocialPostService;
    let transferService: TransferService;
    let rafflePrizeService: RafflePrizeService;
    let escrowService: EscrowService;
    let participantService: ParticipantService;
    let dailyParticipantMetricService: DailyParticipantMetricService;
    let hourlyCampaignMetricsService: HourlyCampaignMetricsService;
    let campaignTemplateService: CampaignTemplateService;
    let campaignMediaService: CampaignMediaService;

    type BatchPayload = {
        count: number;
    };

    const payload: BatchPayload = {
        count: 3,
    };
    beforeAll(async () => {
        await PlatformTest.bootstrap(RestServer)();
    });

    beforeAll(async () => {
        request = SuperTest(PlatformTest.callback());
        sessionService = PlatformTest.get<SessionService>(SessionService);
        adminService = PlatformTest.get<AdminService>(AdminService);
        campaignService = PlatformTest.get(CampaignService);
        socialPostService = PlatformTest.get<SocialPostService>(SocialPostService);
        transferService = PlatformTest.get<TransferService>(TransferService);
        rafflePrizeService = PlatformTest.get<RafflePrizeService>(RafflePrizeService);
        escrowService = PlatformTest.get<EscrowService>(EscrowService);
        participantService = PlatformTest.get<ParticipantService>(ParticipantService);
        dailyParticipantMetricService = PlatformTest.get(DailyParticipantMetricService);
        hourlyCampaignMetricsService = PlatformTest.get(HourlyCampaignMetricsService);
        campaignTemplateService = PlatformTest.get(CampaignTemplateService);
        campaignMediaService = PlatformTest.get(CampaignMediaService);

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

    it("should delete campaign", async () => {
        const query: CampaignIdModel = {
            campaignId: "id",
        };

        const checkPermissionsSpy = jest
            .spyOn(adminService, "checkPermissions")
            .mockResolvedValue({ role: "ADMIN", company: "raiinmaker", orgId: "id", email: "raiinmaker.com" });
        const findSocialPostByCampaignIdSpy = jest
            .spyOn(socialPostService, "findSocialPostByCampaignId")
            .mockResolvedValue([[], 0]);
        const findTransferByCampaignIdSpy = jest
            .spyOn(transferService, "findTransferByCampaignId")
            .mockResolvedValue([]);

        const findRafflePrizeByCampaignIdSpy = jest
            .spyOn(rafflePrizeService, "findRafflePrizeByCampaignId")
            .mockResolvedValue([]);
        const findEscrowByCampaignIdSpy = jest.spyOn(escrowService, "findEscrowByCampaignId").mockResolvedValue([]);
        const findParticipantByCampaignIdSpy = jest
            .spyOn(participantService, "findParticipantByCampaignId")
            .mockResolvedValue(null);

        const findDailyParticipantByCampaignIdSpy = jest
            .spyOn(dailyParticipantMetricService, "findDailyParticipantByCampaignId")
            .mockResolvedValue([]);

        const deleteDailyParticipantMetricsSpy = jest
            .spyOn(dailyParticipantMetricService, "deleteDailyParticipantMetrics")
            .mockResolvedValue(payload);

        const findCampaignHourlyMetricsByCampaignIdSpy = jest
            .spyOn(hourlyCampaignMetricsService, "findCampaignHourlyMetricsByCampaignId")
            .mockResolvedValue([]);

        const findCampaignTemplateByCampaignIdSpy = jest
            .spyOn(campaignTemplateService, "findCampaignTemplateByCampaignId")
            .mockResolvedValue([]);

        const findCampaignMediaByCampaignIdSpy = jest
            .spyOn(campaignMediaService, "findCampaignMediaByCampaignId")
            .mockResolvedValue([]);

        const findCampaignByIdSpy = jest.spyOn(campaignService, "findCampaignById").mockResolvedValue(null);
        const res = await request.post(deleteCampaignRoute).set("Authorization", "token").query(query);

        console.log(res.body);

        handleBaseAssertions(
            res,
            200,
            null,
            checkPermissionsSpy,
            findSocialPostByCampaignIdSpy,
            findCampaignByIdSpy,
            findCampaignHourlyMetricsByCampaignIdSpy,
            findCampaignTemplateByCampaignIdSpy,
            findDailyParticipantByCampaignIdSpy,
            findTransferByCampaignIdSpy,
            findRafflePrizeByCampaignIdSpy,
            findEscrowByCampaignIdSpy,
            findParticipantByCampaignIdSpy,
            findCampaignMediaByCampaignIdSpy,
            deleteDailyParticipantMetricsSpy
        );
    });
});
