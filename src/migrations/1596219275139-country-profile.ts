import { MigrationInterface, QueryRunner } from "typeorm";

export class countryProfile1596219275139 implements MigrationInterface {
    name = "countryProfile1596219275139";

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "profile" ADD "country" text`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "profile" DROP COLUMN "country"`);
    }
}
