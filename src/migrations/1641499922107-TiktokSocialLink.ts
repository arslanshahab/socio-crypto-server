import {MigrationInterface, QueryRunner} from "typeorm";

export class TiktokSocialLink1641499922107 implements MigrationInterface {
    name = 'TiktokSocialLink1641499922107'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "social_link" ADD "accessToken" character varying`);
        await queryRunner.query(`ALTER TABLE "social_link" ADD "accessTokenExpiry" integer`);
        await queryRunner.query(`ALTER TABLE "social_link" ADD "refreshToken" character varying`);
        await queryRunner.query(`ALTER TABLE "social_link" ADD "refreshTokenExpiry" integer`);
        await queryRunner.query(`ALTER TABLE "social_link" ADD "openId" character varying`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "social_link" DROP COLUMN "openId"`);
        await queryRunner.query(`ALTER TABLE "social_link" DROP COLUMN "refreshTokenExpiry"`);
        await queryRunner.query(`ALTER TABLE "social_link" DROP COLUMN "refreshToken"`);
        await queryRunner.query(`ALTER TABLE "social_link" DROP COLUMN "accessTokenExpiry"`);
        await queryRunner.query(`ALTER TABLE "social_link" DROP COLUMN "accessToken"`);
    }

}
