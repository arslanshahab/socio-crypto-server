import { MigrationInterface, QueryRunner } from "typeorm";

export class CustodialAddress1643033940095 implements MigrationInterface {
    name = "CustodialAddress1643033940095";

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(
            `CREATE TABLE "custodial_address" ("id" uuid NOT NULL DEFAULT gen_random_uuid(), "chain" character varying NOT NULL, "free" boolean NOT NULL, "address" character varying NOT NULL, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_66a3eeadf9b81e7784b0240b7bb" PRIMARY KEY ("id"))`
        );
        await queryRunner.query(`ALTER TABLE "tatum_wallet" DROP COLUMN "owner"`);
        await queryRunner.query(`ALTER TABLE "currency" ALTER COLUMN "depositAddress" DROP NOT NULL`);
        await queryRunner.query(`ALTER TABLE "campaign" ALTER COLUMN "symbol" SET NOT NULL`);
        await queryRunner.query(`ALTER TABLE "user" ALTER COLUMN "email" DROP DEFAULT`);
        await queryRunner.query(`ALTER TABLE "user" ALTER COLUMN "password" DROP DEFAULT`);
        await queryRunner.query(`ALTER TABLE "verification" ALTER COLUMN "code" DROP DEFAULT`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "verification" ALTER COLUMN "code" SET DEFAULT ''`);
        await queryRunner.query(`ALTER TABLE "user" ALTER COLUMN "password" SET DEFAULT ''`);
        await queryRunner.query(`ALTER TABLE "user" ALTER COLUMN "email" SET DEFAULT ''`);
        await queryRunner.query(`ALTER TABLE "campaign" ALTER COLUMN "symbol" DROP NOT NULL`);
        await queryRunner.query(`ALTER TABLE "currency" ALTER COLUMN "depositAddress" SET NOT NULL`);
        await queryRunner.query(`ALTER TABLE "tatum_wallet" ADD "owner" character varying NOT NULL`);
        await queryRunner.query(`DROP TABLE "custodial_address"`);
    }
}
