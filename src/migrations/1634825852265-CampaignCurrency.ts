import {MigrationInterface, QueryRunner} from "typeorm";

export class CampaignCurrency1634825852265 implements MigrationInterface {
    name = 'CampaignCurrency1634825852265'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "campaign" ADD "currency" character varying`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "campaign" DROP COLUMN "currency"`);
    }

}
