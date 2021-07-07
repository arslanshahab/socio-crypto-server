import { MigrationInterface, QueryRunner } from "typeorm";

export class XoxodayOrderTable1625571281868 implements MigrationInterface {
    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(
            `CREATE TABLE "xoxoday_order" ("id" uuid NOT NULL DEFAULT gen_random_uuid(), "xoxodayOrderId" character varying NOT NULL, "orderTotal" character varying NOT NULL, "currencyCode" character varying NOT NULL, "coiinPrice" character varying NOT NULL, "poNumber" character varying NOT NULL, "productId" character varying NOT NULL, "quantity" int NOT NULL, "denomination" int NOT NULL, "userId" uuid, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), PRIMARY KEY ("id"))`
        );
    }

    public async down(queryRunner: QueryRunner): Promise<void> {}
}
