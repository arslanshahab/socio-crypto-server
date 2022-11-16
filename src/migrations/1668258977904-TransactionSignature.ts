import {MigrationInterface, QueryRunner} from "typeorm";

export class TransactionSignature1668258977904 implements MigrationInterface {
    name = 'TransactionSignature1668258977904'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "transaction" ADD "signature" character varying`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "transaction" DROP COLUMN "signature"`);
    }

}
