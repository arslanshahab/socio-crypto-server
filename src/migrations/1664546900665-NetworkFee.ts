import { MigrationInterface, QueryRunner } from "typeorm";

export class NetworkFee1664546900665 implements MigrationInterface {
    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "market_data" ADD "networkFee" character varying`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "market_data" DROP COLUMN "networkFee"`);
    }
}
