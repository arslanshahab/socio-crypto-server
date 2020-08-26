import {MigrationInterface, QueryRunner} from "typeorm";

export class FollowerCount1598038376343 implements MigrationInterface {
    name = 'FollowerCount1598038376343'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "social_link" ADD "socialId" character varying`);
        await queryRunner.query(`ALTER TABLE "social_link" ADD "followerCount" integer`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "social_link" DROP COLUMN "followerCount"`);
        await queryRunner.query(`ALTER TABLE "social_link" DROP COLUMN "socialId"`);
    }

}
