import {MigrationInterface, QueryRunner} from "typeorm";

export class CampaignTagline1587764827773 implements MigrationInterface {

    public async up(queryRunner: QueryRunner): Promise<any> {
        await queryRunner.query(`ALTER TABLE "campaign" ADD "tagline" character varying`);
    }

    public async down(queryRunner: QueryRunner): Promise<any> {
        await queryRunner.query(`ALTER TABLE "campaign" DROP COLUMN "tagline"`);
    }

}
