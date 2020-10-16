import {MigrationInterface, QueryRunner} from "typeorm";

export class NotificationSettings1602886814392 implements MigrationInterface {

    public async up(queryRunner: QueryRunner): Promise<any> {
        await queryRunner.query(`CREATE TABLE "notification_settings" ("id" uuid NOT NULL DEFAULT gen_random_uuid(), "kyc" boolean NOT NULL DEFAULT true, "withdraw" boolean NOT NULL DEFAULT true, "campaignCreate" boolean NOT NULL DEFAULT true, "campaignUpdates" boolean NOT NULL DEFAULT true, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), "userId" uuid, CONSTRAINT "REL_5a8ffc3b89343043c9440d631e" UNIQUE ("userId"), CONSTRAINT "PK_d131abd7996c475ef768d4559ba" PRIMARY KEY ("id"))`);
        await queryRunner.query(`ALTER TABLE "notification_settings" ADD CONSTRAINT "FK_5a8ffc3b89343043c9440d631e2" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`INSERT INTO "notification_settings" ("userId") SELECT "user"."id" as "userId" FROM "user"`);
    }

    public async down(queryRunner: QueryRunner): Promise<any> {
        await queryRunner.query(`ALTER TABLE "notification_settings" DROP CONSTRAINT "FK_5a8ffc3b89343043c9440d631e2"`);
        await queryRunner.query(`DROP TABLE "notification_settings"`);
    }

}
