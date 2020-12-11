import {MigrationInterface, QueryRunner} from "typeorm";

export class addsPaypalEmail1607540024305 implements MigrationInterface {
    name = 'addsPaypalEmail1607540024305'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "transfer" ADD "paypalAddress" character varying`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "transfer" DROP COLUMN "paypalAddress"`);
    }

}
