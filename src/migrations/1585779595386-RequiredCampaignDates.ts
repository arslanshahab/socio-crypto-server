import {MigrationInterface, QueryRunner} from "typeorm";

export class RequiredCampaignDates1585779595386 implements MigrationInterface {

    public async up(queryRunner: QueryRunner): Promise<any> {
        await queryRunner.query(`ALTER TABLE "campaign" ALTER COLUMN "beginDate" SET NOT NULL`);
        await queryRunner.query(`ALTER TABLE "campaign" ALTER COLUMN "endDate" SET NOT NULL`);
    }

    public async down(queryRunner: QueryRunner): Promise<any> {
        await queryRunner.query(`ALTER TABLE "campaign" ALTER COLUMN "endDate" DROP NOT NULL`);
        await queryRunner.query(`ALTER TABLE "campaign" ALTER COLUMN "beginDate" DROP NOT NULL`);
    }

}
