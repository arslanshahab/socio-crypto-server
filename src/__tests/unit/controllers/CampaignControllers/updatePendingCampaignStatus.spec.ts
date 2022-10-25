import { PlatformTest } from "@tsed/common";
import { RestServer } from "../../../../RestServer";
import SuperTest from "supertest";
import { SessionService } from "../../../../services/SessionService";
import { CampaignService } from "../../../../services/CampaignService";
import { AdminService } from "../../../../services/AdminService";
import { PendingCampaignsParams } from "../../../../controllers/v1/CampaignController";
import { CampaignStatus } from "../../../../util/constants";
import { handleBaseAssertions, updatePendingCampaignStatusRoute } from "../../../../__tests/test_helper";
import { CAMPAIGN_NOT_FOUND, CAMPAIGN_ORGANIZATION_MISSING } from "../../../../util/errors";
import { Campaign, Org } from "@prisma/client";
import { OrganizationService } from "../../../../services/OrganizationService";
import { FirebaseAdmin } from "../../../../clients/firebaseAdmin";
import { SesClient } from "../../../../clients/ses";
import { User } from "../../../../models/User";

describe("Update Pending Campaign Status", () => {
    let request: SuperTest.SuperTest<SuperTest.Test>;
    let sessionService: SessionService;
    let adminService: AdminService;
    let campaignService: CampaignService;
    let organizationService: OrganizationService;

    const org: Org = {
        id: "id",
        createdAt: new Date(),
        updatedAt: new Date(),
        name: "raiinmaker",
        stripeId: "id",
        logo: "logo",
    };

    const campaign = (hasOrg: boolean): Campaign & { org: Org | null | undefined } => {
        return {
            beginDate: new Date(),
            endDate: new Date(),
            coiinTotal: "2",
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
            status: CampaignStatus.APPROVED,
            cryptoId: "id",
            keywords: "keywords",
            campaignType: "type",
            socialMediaType: "type",
            instructions: "instructions",
            tatumBlockageId: "tatum",
            symbol: "coiin",
            auditStatus: "status",
            isGlobal: true,
            showUrl: true,
            currencyId: "id",
            org: hasOrg ? org : null,
        };
    };

    const userRecord = {
        disabled: false,
        uid: "id",
        metadata: {
            creationTime: "now",
            lastSignInTime: "now",
            toJSON: () => {
                return {};
            },
        },
        providerData: [],
        emailVerified: true,
        toJSON: () => {
            return {};
        },
    };

    beforeAll(async () => {
        await PlatformTest.bootstrap(RestServer)();
    });

    beforeAll(async () => {
        request = SuperTest(PlatformTest.callback());
        sessionService = PlatformTest.get<SessionService>(SessionService);
        adminService = PlatformTest.get<AdminService>(AdminService);
        campaignService = PlatformTest.get(CampaignService);
        organizationService = PlatformTest.get(OrganizationService);

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
        const body: PendingCampaignsParams = {
            campaignId: "id",
            status: CampaignStatus.ACTIVE,
            reason: "reason",
        };

        const checkPermissionsSpy = jest
            .spyOn(adminService, "checkPermissions")
            .mockResolvedValue({ role: "ADMIN", company: "raiinmaker", orgId: "id", email: "raiinmaker.com" });
        const findCampaignByIdSpy = jest.spyOn(campaignService, "findCampaignById").mockResolvedValue(null);

        const res = await request.put(updatePendingCampaignStatusRoute).set("Authorization", "token").send(body);
        handleBaseAssertions(res, 404, CAMPAIGN_NOT_FOUND, checkPermissionsSpy, findCampaignByIdSpy);
    });

    it("should throw CAMPAIGN_ORGANIZATION_MISSING", async () => {
        const body: PendingCampaignsParams = {
            campaignId: "id",
            status: CampaignStatus.ACTIVE,
            reason: "reason",
        };

        const checkPermissionsSpy = jest
            .spyOn(adminService, "checkPermissions")
            .mockResolvedValue({ role: "ADMIN", company: "raiinmaker", orgId: "id", email: "raiinmaker.com" });
        const findCampaignByIdSpy = jest.spyOn(campaignService, "findCampaignById").mockResolvedValue(campaign(false));

        const res = await request.put(updatePendingCampaignStatusRoute).set("Authorization", "token").send(body);

        handleBaseAssertions(res, 404, CAMPAIGN_ORGANIZATION_MISSING, checkPermissionsSpy, findCampaignByIdSpy);
    });

    it("should update pending campaigns, APPROVED", async () => {
        const body: PendingCampaignsParams = {
            campaignId: "id",
            status: CampaignStatus.APPROVED,
            reason: "reason",
        };

        const checkPermissionsSpy = jest
            .spyOn(adminService, "checkPermissions")
            .mockResolvedValue({ role: "ADMIN", company: "raiinmaker", orgId: "id", email: "raiinmaker.com" });
        const findCampaignByIdSpy = jest.spyOn(campaignService, "findCampaignById").mockResolvedValue(campaign(true));
        const getAvailableBalanceSpy = jest.spyOn(organizationService, "getAvailableBalance").mockResolvedValue(5);
        const blockCampaignAmountSpy = jest
            .spyOn(campaignService, "blockCampaignAmount")
            .mockResolvedValue("blockageId");
        const adminUpdateCampaignStatusSpy = jest
            .spyOn(campaignService, "adminUpdateCampaignStatus")
            .mockResolvedValue(campaign(true));
        const listAdminsByOrgSpy = jest.spyOn(adminService, "listAdminsByOrg").mockResolvedValue([]);
        jest.spyOn(FirebaseAdmin, "getUserById").mockResolvedValue(userRecord);
        jest.spyOn(SesClient, "CampaignProcessEmailToAdmin").mockImplementation(
            async (data: { title: string; text: string; emailAddress: string }) => {}
        );
        const getAllDeviceTokensSpy = jest.spyOn(User, "getAllDeviceTokens").mockResolvedValue([]);

        const res = await request.put(updatePendingCampaignStatusRoute).set("Authorization", "token").send(body);

        handleBaseAssertions(
            res,
            200,
            null,
            checkPermissionsSpy,
            findCampaignByIdSpy,
            getAvailableBalanceSpy,
            blockCampaignAmountSpy,
            adminUpdateCampaignStatusSpy,
            listAdminsByOrgSpy,
            getAllDeviceTokensSpy
        );
    });

    it("should update pending campaigns, DENIED", async () => {
        const body: PendingCampaignsParams = {
            campaignId: "id",
            status: CampaignStatus.DENIED,
            reason: "reason",
        };

        const checkPermissionsSpy = jest
            .spyOn(adminService, "checkPermissions")
            .mockResolvedValue({ role: "ADMIN", company: "raiinmaker", orgId: "id", email: "raiinmaker.com" });
        const findCampaignByIdSpy = jest.spyOn(campaignService, "findCampaignById").mockResolvedValue(campaign(true));
        const adminUpdateCampaignStatusSpy = jest
            .spyOn(campaignService, "adminUpdateCampaignStatus")
            .mockResolvedValue(campaign(true));
        const listAdminsByOrgSpy = jest.spyOn(adminService, "listAdminsByOrg").mockResolvedValue([]);
        jest.spyOn(FirebaseAdmin, "getUserById").mockResolvedValue(userRecord);
        jest.spyOn(SesClient, "CampaignProcessEmailToAdmin").mockImplementation(
            async (data: { title: string; text: string; emailAddress: string }) => {}
        );
        const getAllDeviceTokensSpy = jest.spyOn(User, "getAllDeviceTokens").mockResolvedValue([]);

        const res = await request.put(updatePendingCampaignStatusRoute).set("Authorization", "token").send(body);

        handleBaseAssertions(
            res,
            200,
            null,
            checkPermissionsSpy,
            findCampaignByIdSpy,
            adminUpdateCampaignStatusSpy,
            listAdminsByOrgSpy,
            getAllDeviceTokensSpy
        );
    });
});
