import { MigrationInterface, QueryRunner } from "typeorm";

export class TiktokSocialLinkchanges1642003613304 implements MigrationInterface {
    name = "TiktokSocialLinkchanges1642003613304";

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "social_link" DROP COLUMN "accessTokenExpiry"`);
        await queryRunner.query(`ALTER TABLE "social_link" ADD "accessTokenExpiry" character varying`);
        await queryRunner.query(`ALTER TABLE "social_link" DROP COLUMN "refreshTokenExpiry"`);
        await queryRunner.query(`ALTER TABLE "social_link" ADD "refreshTokenExpiry" character varying`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "social_link" DROP COLUMN "refreshTokenExpiry"`);
        await queryRunner.query(`ALTER TABLE "social_link" ADD "refreshTokenExpiry" integer`);
        await queryRunner.query(`ALTER TABLE "social_link" DROP COLUMN "accessTokenExpiry"`);
        await queryRunner.query(`ALTER TABLE "social_link" ADD "accessTokenExpiry" integer`);
    }
}
