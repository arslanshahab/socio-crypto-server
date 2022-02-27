import { MigrationInterface, QueryRunner } from "typeorm";

export class ShowTinyUrl1645824319486 implements MigrationInterface {
    name = "ShowTinyUrl1645824319486";

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "campaign" ADD "showUrl" boolean NOT NULL DEFAULT true`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "campaign" DROP COLUMN "showUrl"`);
    }
}
