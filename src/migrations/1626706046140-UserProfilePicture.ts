import { MigrationInterface, QueryRunner } from "typeorm";

export class UserProfilePicture1626706046140 implements MigrationInterface {
    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query('ALTER TABLE "profile" ADD COLUMN "profilePicture" varchar');
    }

    public async down(queryRunner: QueryRunner): Promise<void> {}
}
