import { MigrationInterface, QueryRunner } from "typeorm";

export class ReferralCodeColumn1651178760020 implements MigrationInterface {
    name = "ReferralCodeColumn1651178760020";

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "user" ADD "referralCode" character varying`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "user" DROP COLUMN "referralCode"`);
    }
}
