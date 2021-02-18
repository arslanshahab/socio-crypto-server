import {MigrationInterface, QueryRunner} from "typeorm";

export class withdrawValueOnTransfer1611777431808 implements MigrationInterface {

    public async up(queryRunner: QueryRunner): Promise<any> {
        await queryRunner.query(`UPDATE "transfer" SET "status" = 'PENDING' WHERE "status" = 'pending'`);
        await queryRunner.query(`UPDATE "transfer" SET "status" = 'APPROVED' WHERE "status" = 'approved'`);
        await queryRunner.query(`UPDATE "transfer" SET "status" = 'REJECTED' WHERE "status" = 'rejected'`);
        await queryRunner.query(`UPDATE "transfer" t SET "usdAmount" = (SELECT CAST(o.amount as decimal) * 0.1 FROM public.transfer o WHERE t.id=o.id) WHERE action = 'withdraw' AND "status" IN ('PENDING','APPROVED')`);
        await queryRunner.query(`INSERT INTO "wallet_currency" ("type", "balance", "walletId") SELECT 'coiin' AS "type", "wallet"."balance" AS "balance", "wallet"."id" AS "walletId" FROM "wallet"`);
        await queryRunner.query(`ALTER TABLE "wallet" DROP COLUMN "balance"`);
    }

    public async down(queryRunner: QueryRunner): Promise<any> {}

}
