import { MigrationInterface, QueryRunner } from "typeorm";

export class FirebaseChanges1640025954557 implements MigrationInterface {
    name = "FirebaseChanges1640025954557";

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "user" ALTER COLUMN "identityId" DROP NOT NULL`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "user" ALTER COLUMN "identityId" SET NOT NULL`);
    }
}
