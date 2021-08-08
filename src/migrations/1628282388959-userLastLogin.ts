import { MigrationInterface, QueryRunner } from "typeorm";

export class userLastLogin1628282388959 implements MigrationInterface {
    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query('ALTER TABLE "user" ADD COLUMN "lastLogin" TIMESTAMP');
    }

    public async down(queryRunner: QueryRunner): Promise<void> {}
}
