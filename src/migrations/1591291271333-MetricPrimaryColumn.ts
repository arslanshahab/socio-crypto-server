import { MigrationInterface, QueryRunner } from "typeorm";

export class MetricPrimaryColumn1591291271333 implements MigrationInterface {
    public async up(queryRunner: QueryRunner): Promise<any> {
        await queryRunner.query(`ALTER TABLE twenty_four_hour_metric ALTER COLUMN id SET DEFAULT gen_random_uuid();`);
    }

    public async down(queryRunner: QueryRunner): Promise<any> {
        await queryRunner.query(`ALTER TABLE twenty_four_hour_metric ALTER COLUMN id DROP DEFAULT`);
    }
}
