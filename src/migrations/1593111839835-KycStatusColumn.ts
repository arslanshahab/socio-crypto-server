import {MigrationInterface, QueryRunner} from "typeorm";

export class KycStatusColumn1593111839835 implements MigrationInterface {

    public async up(queryRunner: QueryRunner): Promise<any> {
        await queryRunner.query(`ALTER TABLE "user" ADD "kycStatus" character varying`);
    }

    public async down(queryRunner: QueryRunner): Promise<any> {
        await queryRunner.query(`ALTER TABLE "user" DROP COLUMN "kycStatus"`);
    }

}
