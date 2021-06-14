import { MigrationInterface, QueryRunner } from "typeorm";

export class HasPhotoBool1587500497979 implements MigrationInterface {
    public async up(queryRunner: QueryRunner): Promise<any> {
        await queryRunner.query(`ALTER TABLE "campaign" DROP COLUMN "image"`);
        await queryRunner.query(`ALTER TABLE "campaign" ADD "hasPhoto" boolean NOT NULL DEFAULT false`);
    }

    public async down(queryRunner: QueryRunner): Promise<any> {
        await queryRunner.query(`ALTER TABLE "campaign" DROP COLUMN "hasPhoto"`);
        await queryRunner.query(`ALTER TABLE "campaign" ADD "image" text`);
    }
}
