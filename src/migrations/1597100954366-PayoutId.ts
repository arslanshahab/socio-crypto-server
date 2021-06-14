import { MigrationInterface, QueryRunner } from "typeorm";

export class PayoutId1597100954366 implements MigrationInterface {
    name = "PayoutId1597100954366";

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "transfer" ADD "payoutStatus" character varying`);
        await queryRunner.query(`ALTER TABLE "transfer" ADD "payoutId" character varying`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "transfer" DROP COLUMN "payoutId"`);
        await queryRunner.query(`ALTER TABLE "transfer" DROP COLUMN "payoutStatus"`);
    }
}
