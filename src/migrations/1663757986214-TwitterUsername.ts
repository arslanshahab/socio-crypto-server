import { MigrationInterface, QueryRunner } from "typeorm";

export class TwitterUsername1663757986214 implements MigrationInterface {
    name = "TwitterUsername1663757986214";

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "social_link" ADD "username" character varying`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "social_link" DROP COLUMN "username"`);
    }
}
