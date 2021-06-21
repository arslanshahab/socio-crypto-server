import { MigrationInterface, QueryRunner } from "typeorm";

export class CampaignKeywords1623924511709 implements MigrationInterface {
    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query('ALTER TABLE "campaign" ADD COLUMN "keywords" text DEFAULT array[]::text[] NOT NULL');
    }

    public async down(queryRunner: QueryRunner): Promise<void> {}
}
