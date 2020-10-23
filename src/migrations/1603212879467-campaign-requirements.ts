import {MigrationInterface, QueryRunner} from "typeorm";

export class campaignRequirements1603212879467 implements MigrationInterface {
    name = 'campaignRequirements1603212879467'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "campaign" ADD "requirements" jsonb`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "campaign" DROP COLUMN "requirements"`);
    }

}
