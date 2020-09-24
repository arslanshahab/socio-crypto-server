import {MigrationInterface, QueryRunner} from "typeorm";

export class FactorNameColumn1600980914692 implements MigrationInterface {

    public async up(queryRunner: QueryRunner): Promise<any> {
        await queryRunner.query(`ALTER TABLE "factor_link" ADD "name" character varying`);
    }

    public async down(queryRunner: QueryRunner): Promise<any> {
        await queryRunner.query(`ALTER TABLE "factor_link" DROP COLUMN "name"`);
    }

}
