import {MigrationInterface, QueryRunner} from "typeorm";

export class CampaignPhoto21587573805401 implements MigrationInterface {

    public async up(queryRunner: QueryRunner): Promise<any> {
        await queryRunner.query(`ALTER TABLE "campaign" DROP COLUMN "hasPhoto"`);
        await queryRunner.query(`ALTER TABLE "campaign" ADD "imagePath" character varying`);
    }

    public async down(queryRunner: QueryRunner): Promise<any> {
        await queryRunner.query(`ALTER TABLE "campaign" DROP COLUMN "imagePath"`);
        await queryRunner.query(`ALTER TABLE "campaign" ADD "hasPhoto" boolean NOT NULL DEFAULT false`);
    }

}
