import { MigrationInterface, QueryRunner } from "typeorm";

export class CampaignSharedImage1626003567681 implements MigrationInterface {
    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query('ALTER TABLE "campaign" ADD COLUMN "sharedMedia" varchar');
    }

    public async down(queryRunner: QueryRunner): Promise<void> {}
}
