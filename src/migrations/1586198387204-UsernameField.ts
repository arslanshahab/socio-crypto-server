import { MigrationInterface, QueryRunner } from "typeorm";
import { v4 as uuidv4 } from "uuid";

export class UsernameField1586198387204 implements MigrationInterface {
    public async up(queryRunner: QueryRunner): Promise<any> {
        await queryRunner.query(`ALTER TABLE "user" ADD "username" character varying`);
        const users = await queryRunner.query('SELECT id FROM "user"');
        for (const user of users) {
            await queryRunner.query(
                `UPDATE "user" SET "username" = '${uuidv4().split("-")[0]}' WHERE "id" = '${user.id}'`
            );
        }
        await queryRunner.query(`ALTER TABLE "user" ALTER COLUMN "username" SET NOT NULL`);
        await queryRunner.query(
            `ALTER TABLE "user" ADD CONSTRAINT "UQ_78a916df40e02a9deb1c4b75edb" UNIQUE ("username")`
        );
    }

    public async down(queryRunner: QueryRunner): Promise<any> {
        await queryRunner.query(`ALTER TABLE "user" DROP CONSTRAINT "UQ_78a916df40e02a9deb1c4b75edb"`);
        await queryRunner.query(`ALTER TABLE "user" DROP COLUMN "username"`);
    }
}
