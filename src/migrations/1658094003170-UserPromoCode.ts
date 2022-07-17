import {MigrationInterface, QueryRunner} from "typeorm";

export class UserPromoCode1658094003170 implements MigrationInterface {
    name = 'UserPromoCode1658094003170'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "user" ADD "promoCode" character varying`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "user" DROP COLUMN "promoCode"`);
    }

}
