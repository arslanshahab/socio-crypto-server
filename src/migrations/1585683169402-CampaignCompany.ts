import {MigrationInterface, QueryRunner} from "typeorm";

export class CampaignCompany1585683169402 implements MigrationInterface {

    public async up(queryRunner: QueryRunner): Promise<any> {
        await queryRunner.query(`ALTER TABLE "campaign" ADD "company" character varying NOT NULL DEFAULT 'raiinmaker'`);
    }

    public async down(queryRunner: QueryRunner): Promise<any> {
        await queryRunner.query(`ALTER TABLE "campaign" DROP COLUMN "company"`);
    }

}
