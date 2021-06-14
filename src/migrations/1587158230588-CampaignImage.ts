import { MigrationInterface, QueryRunner } from "typeorm";

export class CampaignImage1587158230588 implements MigrationInterface {
    public async up(queryRunner: QueryRunner): Promise<any> {
        await queryRunner.query(`ALTER TABLE "campaign" ADD "image" text`);
    }

    public async down(queryRunner: QueryRunner): Promise<any> {
        await queryRunner.query(`ALTER TABLE "campaign" DROP COLUMN "image"`);
    }
}
