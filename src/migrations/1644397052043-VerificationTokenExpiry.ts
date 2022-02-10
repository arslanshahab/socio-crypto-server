import { MigrationInterface, QueryRunner } from "typeorm";

export class VerificationTokenExpiry1644397052043 implements MigrationInterface {
    name = "VerificationTokenExpiry1644397052043";

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "verification" ADD "expiry" TIMESTAMP`);
        await queryRunner.query(`ALTER TABLE "verification" ADD "type" character varying DEFAULT ''`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "verification" DROP COLUMN "type"`);
        await queryRunner.query(`ALTER TABLE "verification" DROP COLUMN "expiry"`);
    }
}
