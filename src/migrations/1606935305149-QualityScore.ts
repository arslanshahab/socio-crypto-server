import { MigrationInterface, QueryRunner } from "typeorm";

export class QualityScore1606935305149 implements MigrationInterface {
    name = "QualityScore1606935305149";

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(
            `CREATE TABLE "quality_score" ("id" uuid NOT NULL DEFAULT gen_random_uuid(), "clicks" character varying NOT NULL DEFAULT 0, "views" character varying NOT NULL DEFAULT 0, "submissions" character varying NOT NULL DEFAULT 0, "likes" character varying NOT NULL DEFAULT 0, "shares" character varying NOT NULL DEFAULT 0, "comments" character varying NOT NULL DEFAULT 0, "participantId" character varying NOT NULL, CONSTRAINT "PK_252e172dc3040a425daafa0ca16" PRIMARY KEY ("id"))`
        );
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DROP TABLE "quality_score"`);
    }
}
