import { MigrationInterface, QueryRunner } from "typeorm";

export class CampaignAuditChanges1637071257838 implements MigrationInterface {
    name = "CampaignAuditChanges1637071257838";

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(
            `ALTER TABLE "campaign" ADD "auditStatus" character varying NOT NULL DEFAULT 'DEFAULT'`
        );
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "campaign" DROP COLUMN "auditStatus"`);
    }
}
