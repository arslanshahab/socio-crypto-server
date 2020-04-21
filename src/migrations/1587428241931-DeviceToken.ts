import {MigrationInterface, QueryRunner} from "typeorm";

export class DeviceToken1587428241931 implements MigrationInterface {

    public async up(queryRunner: QueryRunner): Promise<any> {
        await queryRunner.query(`ALTER TABLE "user" ADD "deviceToken" character varying`);
    }

    public async down(queryRunner: QueryRunner): Promise<any> {
        await queryRunner.query(`ALTER TABLE "user" DROP COLUMN "deviceToken"`);
    }

}
