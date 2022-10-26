import { PlatformTest } from "@tsed/common";
import { RestServer } from "../../../../RestServer";
import SuperTest from "supertest";
import { handleBaseAssertions, transactionHistoryRoute } from "../../../test_helper";
import { SessionService } from "../../../../services/SessionService";
import { AdminService } from "../../../../services/AdminService";
import { ADMIN_NOT_FOUND, ORG_NOT_FOUND, WALLET_NOT_FOUND } from "../../../../util/errors";
import { OrganizationService } from "../../../../services/OrganizationService";
import { Admin, Org, Wallet } from "@prisma/client";
import { WalletService } from "../../../../services/WalletService";
import { TransferService } from "../../../../services/TransferService";

describe("Transaction History ", () => {
    let request: SuperTest.SuperTest<SuperTest.Test>;
    let sessionService: SessionService;
    let adminService: AdminService;
    let organizationService: OrganizationService;
    let walletService: WalletService;
    let transferService: TransferService;

    const admin: Admin = {
        firebaseId: "firebaseId",
        id: "id",
        userId: "userId",
        orgId: "orgId",
        name: "name",
        createdAt: new Date(),
        updatedAt: new Date(),
        twoFactorEnabled: true,
    };

    const org: Org = {
        id: "id",
        name: "name",
        createdAt: new Date(),
        updatedAt: new Date(),
        stripeId: "stripeId",
        logo: "logo",
    };

    const wallet: Wallet = {
        createdAt: new Date(),
        updatedAt: new Date(),
        id: "id",
        userId: "userId",
        orgId: "orgId",
    };

    beforeAll(async () => {
        await PlatformTest.bootstrap(RestServer)();
    });

    beforeAll(async () => {
        request = SuperTest(PlatformTest.callback());
        sessionService = PlatformTest.get<SessionService>(SessionService);
        adminService = PlatformTest.get<AdminService>(AdminService);
        organizationService = PlatformTest.get<OrganizationService>(OrganizationService);
        walletService = PlatformTest.get(WalletService);
        transferService = PlatformTest.get(TransferService);
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
        const res = await request.get(transactionHistoryRoute).set("Authorization", "token");
        handleBaseAssertions(res, 404, ADMIN_NOT_FOUND, findAdminByFirebaseIdSpy);
    });

    it("should throw ORG_NOT_FOUND", async () => {
        const findAdminByFirebaseIdSpy = jest.spyOn(adminService, "findAdminByFirebaseId").mockResolvedValue(admin);
        const findOrgByIdSpy = jest.spyOn(organizationService, "findOrgById").mockResolvedValue(null);
        const res = await request.get(transactionHistoryRoute).set("Authorization", "token");
        handleBaseAssertions(res, 404, ORG_NOT_FOUND, findAdminByFirebaseIdSpy, findOrgByIdSpy);
    });

    it("should throw WALLET_NOT_FOUND", async () => {
        const findAdminByFirebaseIdSpy = jest.spyOn(adminService, "findAdminByFirebaseId").mockResolvedValue(admin);
        const findOrgByIdSpy = jest.spyOn(organizationService, "findOrgById").mockResolvedValue(org);
        const findWalletByOrgIdSpy = jest.spyOn(walletService, "findWalletByOrgId").mockResolvedValue(null);

        const res = await request.get(transactionHistoryRoute).set("Authorization", "token");
        handleBaseAssertions(
            res,
            404,
            WALLET_NOT_FOUND,
            findAdminByFirebaseIdSpy,
            findOrgByIdSpy,
            findWalletByOrgIdSpy
        );
    });

    it("should get transaction history", async () => {
        const findAdminByFirebaseIdSpy = jest.spyOn(adminService, "findAdminByFirebaseId").mockResolvedValue(admin);
        const findOrgByIdSpy = jest.spyOn(organizationService, "findOrgById").mockResolvedValue(org);
        const findWalletByOrgIdSpy = jest.spyOn(walletService, "findWalletByOrgId").mockResolvedValue(wallet);
        const findTransactionsByWalletIdSpy = jest
            .spyOn(transferService, "findTransactionsByWalletId")
            .mockResolvedValue([]);
        const res = await request.get(transactionHistoryRoute).set("Authorization", "token");
        handleBaseAssertions(
            res,
            200,
            null,
            findAdminByFirebaseIdSpy,
            findOrgByIdSpy,
            findWalletByOrgIdSpy,
            findTransactionsByWalletIdSpy
        );
    });
});
