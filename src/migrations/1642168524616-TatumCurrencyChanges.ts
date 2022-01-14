import { MigrationInterface, QueryRunner } from "typeorm";

export class TatumCurrencyChanges1642168524616 implements MigrationInterface {
    name = "TatumCurrencyChanges1642168524616";

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "currency" ADD "derivationKey" integer`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "currency" DROP COLUMN "derivationKey"`);
    }
}
