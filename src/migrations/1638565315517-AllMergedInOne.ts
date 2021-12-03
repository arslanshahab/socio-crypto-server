import { MigrationInterface, QueryRunner } from "typeorm";

export class AllMergedInOne1638565315517 implements MigrationInterface {
    name = "AllMergedInOne1638565315517";

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "tatum_account" DROP COLUMN "accountingCurrency"`);
        await queryRunner.query(`ALTER TABLE "tatum_account" ADD "memo" character varying`);
        await queryRunner.query(`ALTER TABLE "tatum_account" ADD "message" character varying`);
        await queryRunner.query(`ALTER TABLE "tatum_account" ADD "destinationTag" integer`);
        await queryRunner.query(`ALTER TABLE "tatum_account" ADD "userId" uuid`);
        await queryRunner.query(
            `ALTER TABLE "tatum_account" ADD CONSTRAINT "FK_49a94263eaae183abe64b42b8a4" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`
        );
        await queryRunner.query(`ALTER TABLE "campaign" ADD "currency" character varying`);
        await queryRunner.query(`ALTER TABLE "campaign" ADD "tatumBlockageId" character varying`);
        await queryRunner.query(`ALTER TABLE "transfer" ADD "userId" uuid`);
        await queryRunner.query(
            `ALTER TABLE "transfer" ADD CONSTRAINT "FK_79345be54b82de8207be305a9d3" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`
        );
        await queryRunner.query(`ALTER TABLE "transfer" DROP CONSTRAINT "FK_79345be54b82de8207be305a9d3"`);
        await queryRunner.query(`ALTER TABLE "campaign" RENAME COLUMN "currency" TO "symbol"`);
        await queryRunner.query(
            `CREATE TABLE "currency" ("id" uuid NOT NULL DEFAULT gen_random_uuid(), "tatumId" character varying NOT NULL, "symbol" character varying NOT NULL, "depositAddress" character varying NOT NULL, "memo" character varying, "message" character varying, "destinationTag" integer, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), "walletId" uuid, CONSTRAINT "PK_3cda65c731a6264f0e444cc9b91" PRIMARY KEY ("id"))`
        );
        await queryRunner.query(`ALTER TABLE "transfer" DROP COLUMN "userId"`);
        await queryRunner.query(
            `ALTER TABLE "currency" ADD CONSTRAINT "FK_ea00856ad382361ea6545c3d23c" FOREIGN KEY ("walletId") REFERENCES "wallet"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`
        );
        await queryRunner.query(
            `ALTER TABLE "campaign" ADD "auditStatus" character varying NOT NULL DEFAULT 'DEFAULT'`
        );
        await queryRunner.query(
            `CREATE TABLE "verification" ("id" uuid NOT NULL DEFAULT gen_random_uuid(), "email" character varying NOT NULL, "verified" boolean DEFAULT false, "token" character varying NOT NULL, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), "userId" uuid, CONSTRAINT "PK_f7e3a90ca384e71d6e2e93bb340" PRIMARY KEY ("id"))`
        );
        await queryRunner.query(
            `ALTER TABLE "verification" ADD CONSTRAINT "FK_8300048608d8721aea27747b07a" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`
        );
    }

    public async down(queryRunner: QueryRunner): Promise<void> {}
}
