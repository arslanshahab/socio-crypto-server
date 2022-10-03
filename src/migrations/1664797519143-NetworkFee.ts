import { MigrationInterface, QueryRunner } from "typeorm";

export class NetworkFee1664797519143 implements MigrationInterface {
    name = "NetworkFee1664797519143";

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "market_data" ADD "networkFee" character varying`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "market_data" DROP COLUMN "networkFee"`);
    }
}
