import { MigrationInterface, QueryRunner } from "typeorm";

export class FirebaseChanges1640007765206 implements MigrationInterface {
    name = "FirebaseChanges1640007765206";

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "user" ADD "firebaseId" character varying`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "user" DROP COLUMN "firebaseId"`);
    }
}
