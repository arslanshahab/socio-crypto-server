import {MigrationInterface, QueryRunner} from "typeorm";

export class SocialMetrics1587659299521 implements MigrationInterface {
    name = 'SocialMetrics1587659299521'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TABLE "social_post" ("id" character varying NOT NULL, "type" character varying NOT NULL DEFAULT 'twitter', "likes" integer NOT NULL DEFAULT 0, "shares" integer NOT NULL DEFAULT 0, "comments" integer NOT NULL DEFAULT 0, "participantId" character varying NOT NULL, "userId" character varying NOT NULL, "campaignId" uuid NOT NULL, CONSTRAINT "PK_361a1688e628ebb9c56ecc9cacb" PRIMARY KEY ("id", "userId", "campaignId"))`);
        await queryRunner.query(`ALTER TABLE "social_post" ADD CONSTRAINT "FK_ac33a6e1367ede7117c1742d6a4" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "social_post" ADD CONSTRAINT "FK_3073fc6f7d48ae9dc23af5f00f6" FOREIGN KEY ("campaignId") REFERENCES "campaign"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "social_post" DROP CONSTRAINT "FK_3073fc6f7d48ae9dc23af5f00f6"`);
        await queryRunner.query(`ALTER TABLE "social_post" DROP CONSTRAINT "FK_ac33a6e1367ede7117c1742d6a4"`);
        await queryRunner.query(`DROP TABLE "social_post"`);
    }

}
