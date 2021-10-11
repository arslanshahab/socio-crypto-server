import { MigrationInterface, QueryRunner } from "typeorm";

export class tatumAccount1630278657507 implements MigrationInterface {
    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(
            `CREATE TABLE "tatum_account" ("id" uuid NOT NULL DEFAULT gen_random_uuid(), "accountId" character varying NOT NULL, "currency" character varying NOT NULL, "accountingCurrency" character varying NOT NULL, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), PRIMARY KEY ("id"))`
        );
    }

    public async down(queryRunner: QueryRunner): Promise<void> {}
}
