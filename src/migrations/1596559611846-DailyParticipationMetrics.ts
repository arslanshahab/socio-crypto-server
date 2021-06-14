import { MigrationInterface, QueryRunner } from "typeorm";

export class DailyParticipationMetrics1596559611846 implements MigrationInterface {
    public async up(queryRunner: QueryRunner): Promise<any> {
        await queryRunner.query(
            `CREATE TABLE "daily_participant_metric" ("id" uuid NOT NULL DEFAULT gen_random_uuid(), "clickCount" character varying NOT NULL DEFAULT 0, "viewCount" character varying NOT NULL DEFAULT 0, "submissionCount" character varying NOT NULL DEFAULT 0, "likeCount" character varying NOT NULL DEFAULT 0, "shareCount" character varying NOT NULL DEFAULT 0, "commentCount" character varying NOT NULL DEFAULT 0, "participationScore" character varying NOT NULL DEFAULT 0, "totalParticipationScore" character varying NOT NULL DEFAULT 0, "participantId" character varying NOT NULL, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), "userId" uuid, "campaignId" uuid, CONSTRAINT "PK_2941b85aab0073a60a1319ec3b4" PRIMARY KEY ("id"))`
        );
        await queryRunner.query(
            `ALTER TABLE "daily_participant_metric" ADD CONSTRAINT "FK_82c4ef42af06b025fe03a6b7d34" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`
        );
        await queryRunner.query(
            `ALTER TABLE "daily_participant_metric" ADD CONSTRAINT "FK_339b0794c16489770996c4991ca" FOREIGN KEY ("campaignId") REFERENCES "campaign"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`
        );
    }

    public async down(queryRunner: QueryRunner): Promise<any> {
        await queryRunner.query(
            `ALTER TABLE "daily_participant_metric" DROP CONSTRAINT "FK_339b0794c16489770996c4991ca"`
        );
        await queryRunner.query(
            `ALTER TABLE "daily_participant_metric" DROP CONSTRAINT "FK_82c4ef42af06b025fe03a6b7d34"`
        );
        await queryRunner.query(`DROP TABLE "daily_participant_metric"`);
    }
}
