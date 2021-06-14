import { MigrationInterface, QueryRunner } from "typeorm";

export class TargetVideoColumn1586463640007 implements MigrationInterface {
    public async up(queryRunner: QueryRunner): Promise<any> {
        await queryRunner.query(`ALTER TABLE "campaign" ADD "targetVideo" character varying`);
    }

    public async down(queryRunner: QueryRunner): Promise<any> {
        await queryRunner.query(`ALTER TABLE "campaign" DROP COLUMN "targetVideo"`);
    }
}
