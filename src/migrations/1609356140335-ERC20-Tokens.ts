import {MigrationInterface, QueryRunner} from "typeorm";

export class ERC20Tokens1609356140335 implements MigrationInterface {
    name = 'ERC20Tokens1609356140335'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TABLE "wallet_currency" ("id" uuid NOT NULL DEFAULT gen_random_uuid(), "type" character varying NOT NULL DEFAULT 'Coiin', "balance" character varying NOT NULL DEFAULT 0, "fundingWalletId" uuid, CONSTRAINT "PK_3a458d3da4096019c5cd630c22e" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TABLE "crypto_transaction" ("id" uuid NOT NULL DEFAULT gen_random_uuid(), "blockNumber" integer, "from" character varying, "to" character varying, "hash" character varying, "type" character varying, "convertedValue" character varying, "cryptoId" uuid, CONSTRAINT "PK_7107601dbf52f2f9d52d8890467" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TABLE "crypto_currency" ("id" uuid NOT NULL DEFAULT gen_random_uuid(), "type" character varying NOT NULL, "contractAddress" character varying NOT NULL, CONSTRAINT "UQ_6c11f6c7a2b89fce698221b2f50" UNIQUE ("contractAddress"), CONSTRAINT "PK_95addf5dd9597703119a61255bf" PRIMARY KEY ("id"))`);
        await queryRunner.query(`ALTER TABLE "funding_wallet" DROP COLUMN "balance"`);
        await queryRunner.query(`ALTER TABLE "campaign" ADD "cryptoId" uuid`);
        await queryRunner.query(`ALTER TABLE "wallet_currency" ADD CONSTRAINT "FK_c91032fc0ca900f7458596bc252" FOREIGN KEY ("fundingWalletId") REFERENCES "funding_wallet"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "crypto_transaction" ADD CONSTRAINT "FK_ea1d711f8ac8362a89ae10d4ecd" FOREIGN KEY ("cryptoId") REFERENCES "crypto_currency"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "campaign" ADD CONSTRAINT "FK_6c80d74e57757c61ae9b7255f79" FOREIGN KEY ("cryptoId") REFERENCES "crypto_currency"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "crypto_currency" ADD CONSTRAINT "UQ_11b2d6b4f14611301518cdec2e9" UNIQUE ("type")`);
        await queryRunner.query(`ALTER TABLE "crypto_currency" ALTER COLUMN "contractAddress" DROP NOT NULL`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "campaign" DROP CONSTRAINT "FK_6c80d74e57757c61ae9b7255f79"`);
        await queryRunner.query(`ALTER TABLE "crypto_transaction" DROP CONSTRAINT "FK_ea1d711f8ac8362a89ae10d4ecd"`);
        await queryRunner.query(`ALTER TABLE "wallet_currency" DROP CONSTRAINT "FK_c91032fc0ca900f7458596bc252"`);
        await queryRunner.query(`ALTER TABLE "crypto_currency" DROP CONSTRAINT "UQ_11b2d6b4f14611301518cdec2e9"`);
        await queryRunner.query(`ALTER TABLE "campaign" DROP COLUMN "cryptoId"`);
        await queryRunner.query(`ALTER TABLE "funding_wallet" ADD "balance" character varying NOT NULL DEFAULT 0`);
        await queryRunner.query(`ALTER TABLE "crypto_currency" ALTER COLUMN "contractAddress" SET NOT NULL`);
        await queryRunner.query(`DROP TABLE "crypto_currency"`);
        await queryRunner.query(`DROP TABLE "crypto_transaction"`);
        await queryRunner.query(`DROP TABLE "wallet_currency"`);
    }

}
