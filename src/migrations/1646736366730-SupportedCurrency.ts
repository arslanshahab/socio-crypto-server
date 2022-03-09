import { MigrationInterface, QueryRunner } from "typeorm";

export class SupportedCurrency1646736366730 implements MigrationInterface {
    name = "SupportedCurrency1646736366730";

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(
            `CREATE TABLE "supported_currency" ("id" uuid NOT NULL DEFAULT gen_random_uuid(), "symbol" character varying NOT NULL, "contractAddress" character varying NOT NULL DEFAULT '0x0000000000000000000000000000000000000000', "enabled" boolean NOT NULL DEFAULT true, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_2e485dd8c3b90bc8e9b9441e833" PRIMARY KEY ("id"))`
        );
        await queryRunner.query(`ALTER TABLE "tatum_wallet" DROP COLUMN "enabled"`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "tatum_wallet" ADD "enabled" boolean NOT NULL`);
        await queryRunner.query(`DROP TABLE "supported_currency"`);
    }
}
