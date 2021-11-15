import {MigrationInterface, QueryRunner} from "typeorm";

export class SchemaChanges1637005135040 implements MigrationInterface {
    name = 'SchemaChanges1637005135040'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "transfer" DROP CONSTRAINT "FK_79345be54b82de8207be305a9d3"`);
        await queryRunner.query(`ALTER TABLE "campaign" RENAME COLUMN "currency" TO "symbol"`);
        await queryRunner.query(`CREATE TABLE "currency" ("id" uuid NOT NULL DEFAULT gen_random_uuid(), "tatumId" character varying NOT NULL, "symbol" character varying NOT NULL, "depositAddress" character varying NOT NULL, "memo" character varying, "message" character varying, "destinationTag" integer, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), "walletId" uuid, CONSTRAINT "PK_3cda65c731a6264f0e444cc9b91" PRIMARY KEY ("id"))`);
        await queryRunner.query(`ALTER TABLE "transfer" DROP COLUMN "userId"`);
        await queryRunner.query(`ALTER TABLE "campaign" ALTER COLUMN "symbol" SET NOT NULL`);
        await queryRunner.query(`ALTER TABLE "currency" ADD CONSTRAINT "FK_ea00856ad382361ea6545c3d23c" FOREIGN KEY ("walletId") REFERENCES "wallet"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "currency" DROP CONSTRAINT "FK_ea00856ad382361ea6545c3d23c"`);
        await queryRunner.query(`ALTER TABLE "campaign" ALTER COLUMN "symbol" DROP NOT NULL`);
        await queryRunner.query(`ALTER TABLE "transfer" ADD "userId" uuid`);
        await queryRunner.query(`DROP TABLE "currency"`);
        await queryRunner.query(`ALTER TABLE "campaign" RENAME COLUMN "symbol" TO "currency"`);
        await queryRunner.query(`ALTER TABLE "transfer" ADD CONSTRAINT "FK_79345be54b82de8207be305a9d3" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
    }

}
