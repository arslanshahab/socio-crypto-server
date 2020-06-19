import {MigrationInterface, QueryRunner} from "typeorm";

export class CampaignRelationToTransfer1592588010821 implements MigrationInterface {

    public async up(queryRunner: QueryRunner): Promise<any> {
        await queryRunner.query(`ALTER TABLE "transfer" DROP COLUMN "campaignId"`);
        await queryRunner.query(`ALTER TABLE "transfer" ADD "campaignId" uuid`);
        await queryRunner.query(`ALTER TABLE "transfer" ADD CONSTRAINT "FK_bbe21a18f940dab59ffd61671ef" FOREIGN KEY ("campaignId") REFERENCES "campaign"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<any> {
        await queryRunner.query(`ALTER TABLE "transfer" DROP CONSTRAINT "FK_bbe21a18f940dab59ffd61671ef"`);
        await queryRunner.query(`ALTER TABLE "transfer" DROP COLUMN "campaignId"`);
        await queryRunner.query(`ALTER TABLE "transfer" ADD "campaignId" character varying`);
    }

}
