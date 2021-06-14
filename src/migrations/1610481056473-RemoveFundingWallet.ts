import { MigrationInterface, QueryRunner } from "typeorm";

export class RemoveFundingWallet1610481056473 implements MigrationInterface {
    name = "RemoveFundingWallet1610481056473";

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DROP TABLE "funding_wallet" CASCADE`);
        await queryRunner.query(`ALTER TABLE "wallet_currency" DROP COLUMN "fundingWalletId"`);
        await queryRunner.query(`ALTER TABLE "external_address" DROP COLUMN "fundingWalletId"`);
        await queryRunner.query(`ALTER TABLE "escrow" DROP COLUMN "fundingWalletId"`);
        await queryRunner.query(`ALTER TABLE "transfer" DROP COLUMN "fundingWalletId"`);
        await queryRunner.query(`ALTER TABLE "external_address" ADD "walletId" uuid`);
        await queryRunner.query(`ALTER TABLE "wallet_currency" ADD "walletId" uuid`);
        await queryRunner.query(`ALTER TABLE "escrow" ADD "walletId" uuid`);
        await queryRunner.query(`ALTER TABLE "wallet" ADD "orgId" uuid`);
        await queryRunner.query(
            `ALTER TABLE "wallet" ADD CONSTRAINT "UQ_bf1e49e09b07f54d894eee24803" UNIQUE ("orgId")`
        );
        await queryRunner.query(
            `ALTER TABLE "wallet_currency" ADD CONSTRAINT "FK_2c16fccf4e3ac04ec0e6f4f68d0" FOREIGN KEY ("walletId") REFERENCES "wallet"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`
        );
        await queryRunner.query(
            `ALTER TABLE "external_address" ADD CONSTRAINT "FK_11b6bf0a61503812833359e9d3d" FOREIGN KEY ("walletId") REFERENCES "wallet"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`
        );
        await queryRunner.query(
            `ALTER TABLE "escrow" ADD CONSTRAINT "FK_f980ed731d30053ac7e941c795c" FOREIGN KEY ("walletId") REFERENCES "wallet"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`
        );
        await queryRunner.query(
            `ALTER TABLE "wallet" ADD CONSTRAINT "FK_bf1e49e09b07f54d894eee24803" FOREIGN KEY ("orgId") REFERENCES "org"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`
        );
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(
            `CREATE TABLE "external_address" ("id" uuid NOT NULL DEFAULT gen_random_uuid(), "ethereumAddress" character varying NOT NULL, "claimed" boolean NOT NULL DEFAULT false, "claimMessage" character varying NOT NULL, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), "fundingWalletId" uuid, "userId" uuid, CONSTRAINT "UQ_f725434929b77da9f8e1aeb9c42" UNIQUE ("ethereumAddress"), CONSTRAINT "PK_23160bcba1fe6e3e4fe67af66b3" PRIMARY KEY ("id"))`
        );
        await queryRunner.query(`ALTER TABLE "funding_wallet" DROP COLUMN "balance"`);
        await queryRunner.query(
            `ALTER TABLE "wallet_currency" ADD CONSTRAINT "FK_c91032fc0ca900f7458596bc252" FOREIGN KEY ("fundingWalletId") REFERENCES "funding_wallet"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`
        );
        await queryRunner.query(`ALTER TABLE "wallet" DROP CONSTRAINT "FK_bf1e49e09b07f54d894eee24803"`);
        await queryRunner.query(`ALTER TABLE "escrow" DROP CONSTRAINT "FK_f980ed731d30053ac7e941c795c"`);
        await queryRunner.query(`ALTER TABLE "external_address" DROP CONSTRAINT "FK_11b6bf0a61503812833359e9d3d"`);
        await queryRunner.query(`ALTER TABLE "wallet_currency" DROP CONSTRAINT "FK_2c16fccf4e3ac04ec0e6f4f68d0"`);
        await queryRunner.query(`ALTER TABLE "wallet" DROP CONSTRAINT "UQ_bf1e49e09b07f54d894eee24803"`);
        await queryRunner.query(`ALTER TABLE "wallet" DROP COLUMN "orgId"`);
        await queryRunner.query(`ALTER TABLE "wallet" ADD "orgId" character varying NOT NULL DEFAULT 0`);
        await queryRunner.query(`ALTER TABLE "transfer" ADD "fundingWalletId" uuid`);
        await queryRunner.query(`ALTER TABLE "wallet" RENAME COLUMN "orgId" TO "balance"`);
        await queryRunner.query(`ALTER TABLE "escrow" RENAME COLUMN "walletId" TO "fundingWalletId"`);
        await queryRunner.query(`ALTER TABLE "external_address" RENAME COLUMN "walletId" TO "fundingWalletId"`);
        await queryRunner.query(`ALTER TABLE "wallet_currency" RENAME COLUMN "walletId" TO "fundingWalletId"`);
        await queryRunner.query(
            `ALTER TABLE "transfer" ADD CONSTRAINT "FK_584f181d9d102bb8ac5b02bf343" FOREIGN KEY ("fundingWalletId") REFERENCES "funding_wallet"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`
        );
        await queryRunner.query(
            `ALTER TABLE "escrow" ADD CONSTRAINT "FK_e0ad6604a987e01b17965bdeae4" FOREIGN KEY ("fundingWalletId") REFERENCES "funding_wallet"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`
        );
        await queryRunner.query(
            `ALTER TABLE "external_address" ADD CONSTRAINT "FK_d288b9c0ec91db01f0285a2a985" FOREIGN KEY ("fundingWalletId") REFERENCES "funding_wallet"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`
        );
        await queryRunner.query(
            `ALTER TABLE "wallet_currency" ADD CONSTRAINT "FK_c91032fc0ca900f7458596bc252" FOREIGN KEY ("fundingWalletId") REFERENCES "funding_wallet"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`
        );
    }
}
