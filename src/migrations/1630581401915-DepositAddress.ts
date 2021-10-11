import { MigrationInterface, QueryRunner } from "typeorm";

export class DepositAddress1630581401915 implements MigrationInterface {
    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(
            `CREATE TABLE "deposit_address" ("id" uuid NOT NULL DEFAULT gen_random_uuid(), "adminId" uuid NOT NULL, "currency" character varying NOT NULL, "address" character varying NOT NULL, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), PRIMARY KEY ("id"))`
        );
    }

    public async down(queryRunner: QueryRunner): Promise<void> {}
}
