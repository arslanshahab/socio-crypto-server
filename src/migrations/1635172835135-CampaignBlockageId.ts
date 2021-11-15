import {MigrationInterface, QueryRunner} from "typeorm";

export class CampaignBlockageId1635172835135 implements MigrationInterface {
    name = 'CampaignBlockageId1635172835135'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "campaign" ADD "tatumBlockageId" character varying`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "campaign" DROP COLUMN "tatumBlockageId"`);
    }

}
