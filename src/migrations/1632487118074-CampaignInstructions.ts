import { MigrationInterface, QueryRunner } from "typeorm";

export class CampaignInstructions1632487118074 implements MigrationInterface {
    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query('ALTER TABLE "campaign" ADD COLUMN "instructions" character varying');
    }

    public async down(queryRunner: QueryRunner): Promise<void> {}
}
