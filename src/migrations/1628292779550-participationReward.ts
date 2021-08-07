import { MigrationInterface, QueryRunner } from "typeorm";

export class participationReward1628292779550 implements MigrationInterface {
    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query('ALTER TABLE "participant" ADD COLUMN "reward" uuid');
    }

    public async down(queryRunner: QueryRunner): Promise<void> {}
}
