import {MigrationInterface, QueryRunner} from "typeorm";

export class OrganizationLogo1660641204821 implements MigrationInterface {
    name = 'OrganizationLogo1660641204821'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "org" ADD "logo" character varying`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "org" DROP COLUMN "logo"`);
    }

}
