import { MigrationInterface, QueryRunner } from "typeorm";

export class NetworkFee1664959180294 implements MigrationInterface {
    name = "NetworkFee1664959180294";

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "market_data" ADD "network" character varying NOT NULL`);
        await queryRunner.query(`ALTER TABLE "market_data" ADD "networkFee" character varying`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "market_data" DROP COLUMN "networkFee"`);
        await queryRunner.query(`ALTER TABLE "market_data" DROP COLUMN "network"`);
    }
}
