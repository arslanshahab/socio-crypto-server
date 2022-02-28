import { MigrationInterface, QueryRunner } from "typeorm";

export class TransferNetwork1646053865507 implements MigrationInterface {
    name = "TransferNetwork1646053865507";

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "transfer" ADD "network" character varying`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "transfer" DROP COLUMN "network"`);
    }
}
