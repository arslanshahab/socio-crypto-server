import { MigrationInterface, QueryRunner } from "typeorm";

export class CampaignTypeColumn1631652245657 implements MigrationInterface {
    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query('ALTER TABLE "campaign" ADD COLUMN "campaignType" character varying');
        await queryRunner.query('ALTER TABLE "campaign" ADD COLUMN "socialMediaType" character varying');
    }

    public async down(queryRunner: QueryRunner): Promise<void> {}
}
