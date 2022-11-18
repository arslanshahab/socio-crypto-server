import {MigrationInterface, QueryRunner} from "typeorm";

export class UpdateCampaignMedia1668776930113 implements MigrationInterface {
    name = 'UpdateCampaignMedia1668776930113'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "campaign_media" ADD "ratio" character varying`);
        await queryRunner.query(`ALTER TABLE "campaign_media" ADD "slug" character varying`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "campaign_media" DROP COLUMN "slug"`);
        await queryRunner.query(`ALTER TABLE "campaign_media" DROP COLUMN "ratio"`);
    }

}
