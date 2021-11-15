import { MigrationInterface, QueryRunner } from "typeorm";

export class SchemaChanges1637002441805 implements MigrationInterface {
    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(
            `CREATE TABLE "currency" ("id" uuid NOT NULL DEFAULT gen_random_uuid(), "tatumId" character varying NOT NULL, "symbol" character varying NOT NULL, "depositAddress" character varying NOT NULL, "memo" character varying, "message" character varying, "destinationTag" integer, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), "walletId" uuid, CONSTRAINT "PK_3cda65c731a6264f0e444cc9b91" PRIMARY KEY ("id"))`
        );
        await queryRunner.query(
            `ALTER TABLE "currency" ADD CONSTRAINT "FK_ea00856ad382361ea6545c3d23c" FOREIGN KEY ("walletId") REFERENCES "wallet"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`
        );
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "currency" DROP CONSTRAINT "FK_ea00856ad382361ea6545c3d23c"`);
        await queryRunner.query(`ALTER TABLE "currency" DROP CONSTRAINT "FK_ea00856ad382361ea6545c3d23c"`);
    }
}
