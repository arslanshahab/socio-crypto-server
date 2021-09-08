import { MigrationInterface, QueryRunner } from "typeorm";

export class CampaignSharedMedia1626343245615 implements MigrationInterface {
    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query('ALTER TABLE "campaign" RENAME COLUMN "sharedImagePath" TO "sharedMedia"');
        await queryRunner.query('ALTER TABLE "campaign" ADD COLUMN "sharedMediaFormat" varchar');
    }

    public async down(queryRunner: QueryRunner): Promise<void> {}
}