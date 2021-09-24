import { MigrationInterface, QueryRunner } from "typeorm";

export class CampaignSocialMediaType1632475815068 implements MigrationInterface {
    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query('ALTER TABLE "campaign" DROP COLUMN "socialMediaType"');
        await queryRunner.query(
            'ALTER TABLE "campaign" ADD COLUMN "socialMediaType" text DEFAULT array[]::text[] NOT NULL'
        );
    }

    public async down(queryRunner: QueryRunner): Promise<void> {}
}
