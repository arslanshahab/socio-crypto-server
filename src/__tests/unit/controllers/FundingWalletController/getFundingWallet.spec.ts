import { PlatformTest } from "@tsed/common";
import { RestServer } from "../../../../RestServer";
import SuperTest from "supertest";
import { fundingWalletRoute, handleBaseAssertions } from "../../../test_helper";
import { SessionService } from "../../../../services/SessionService";
import { AdminService } from "../../../../services/AdminService";
// import { CryptoCurrencyService } from "../../../../services/CryptoCurrencyService";
import { ADMIN_NOT_FOUND, ORG_NOT_FOUND, WALLET_NOT_FOUND } from "../../../../util/errors";
import { OrganizationService } from "../../../../services/OrganizationService";
import { Admin, Org, Wallet } from "@prisma/client";
import { WalletService } from "../../../../services/WalletService";
import { CurrencyService } from "../../../../services/CurrencyService";
import { TatumService } from "../../../../services/TatumService";
import * as util from "../../../../util";

describe("Funding Wallet ", () => {
    let request: SuperTest.SuperTest<SuperTest.Test>;
    let sessionService: SessionService;
    let adminService: AdminService;
    let organizationService: OrganizationService;
    let walletService: WalletService;
    let currencyService: CurrencyService;
    let tatumService: TatumService;
    // let cryptoCurrencyService: CryptoCurrencyService;

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
        tatumService = PlatformTest.get<TatumService>(TatumService);
        currencyService = PlatformTest.get(CurrencyService);
        // cryptoCurrencyService = PlatformTest.get(CryptoCurrencyService);

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
        const res = await request.get(fundingWalletRoute).set("Authorization", "token");
        handleBaseAssertions(res, 404, ADMIN_NOT_FOUND, findAdminByFirebaseIdSpy);
    });

    it("should throw ORG_NOT_FOUND", async () => {
        const findAdminByFirebaseIdSpy = jest.spyOn(adminService, "findAdminByFirebaseId").mockResolvedValue(admin);
        const findOrgByIdSpy = jest.spyOn(organizationService, "findOrgById").mockResolvedValue(null);
        const res = await request.get(fundingWalletRoute).set("Authorization", "token");
        handleBaseAssertions(res, 404, ORG_NOT_FOUND, findAdminByFirebaseIdSpy, findOrgByIdSpy);
    });

    it("should throw WALLET_NOT_FOUND", async () => {
        const findAdminByFirebaseIdSpy = jest.spyOn(adminService, "findAdminByFirebaseId").mockResolvedValue(admin);
        const findOrgByIdSpy = jest.spyOn(organizationService, "findOrgById").mockResolvedValue(org);
        const findWalletByOrgIdSpy = jest.spyOn(walletService, "findWalletByOrgId").mockResolvedValue(null);

        const res = await request.get(fundingWalletRoute).set("Authorization", "token");
        handleBaseAssertions(
            res,
            404,
            WALLET_NOT_FOUND,
            findAdminByFirebaseIdSpy,
            findOrgByIdSpy,
            findWalletByOrgIdSpy
        );
    });

    it("should get funding wallet", async () => {
        const findAdminByFirebaseIdSpy = jest.spyOn(adminService, "findAdminByFirebaseId").mockResolvedValue(admin);
        const findOrgByIdSpy = jest.spyOn(organizationService, "findOrgById").mockResolvedValue(org);
        const findWalletByOrgIdSpy = jest.spyOn(walletService, "findWalletByOrgId").mockResolvedValue(wallet);
        const findCurrenciesByWalletIdSpy = jest
            .spyOn(currencyService, "findCurrenciesByWalletId")
            .mockResolvedValue([]);
        const getBalanceForAccountListSpy = jest.spyOn(tatumService, "getBalanceForAccountList").mockResolvedValue([]);
        jest.spyOn(util, "formatFloat").mockImplementation((val: string) => val);
        jest.spyOn(util, "getCryptoAssestImageUrl").mockImplementation((symbol) => symbol);

        const res = await request.get(fundingWalletRoute).set("Authorization", "token");
        handleBaseAssertions(
            res,
            200,
            null,
            findAdminByFirebaseIdSpy,
            findOrgByIdSpy,
            findWalletByOrgIdSpy,
            findCurrenciesByWalletIdSpy,
            getBalanceForAccountListSpy
        );
    });
});
