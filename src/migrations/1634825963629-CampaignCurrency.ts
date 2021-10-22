import {MigrationInterface, QueryRunner} from "typeorm";

export class CampaignCurrency1634825963629 implements MigrationInterface {
    name = 'CampaignCurrency1634825963629'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "campaign" ALTER COLUMN "currency" SET NOT NULL`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "campaign" ALTER COLUMN "currency" DROP NOT NULL`);
    }

}
