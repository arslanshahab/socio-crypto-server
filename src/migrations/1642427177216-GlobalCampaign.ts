import { MigrationInterface, QueryRunner } from "typeorm";

export class GlobalCampaign1642427177216 implements MigrationInterface {
    name = "GlobalCampaign1642427177216";

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "campaign" ADD "isGlobal" boolean NOT NULL DEFAULT false`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "campaign" DROP COLUMN "isGlobal"`);
    }
}
