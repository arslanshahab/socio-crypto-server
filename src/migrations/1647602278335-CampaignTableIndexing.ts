import { MigrationInterface, QueryRunner } from "typeorm";

export class CampaignTableIndexing1647602278335 implements MigrationInterface {
    name = "CampaignTableIndexing1647602278335";

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE INDEX "IDX_4293bebb45d5083b55b41ac95d" ON "campaign" ("beginDate") `);
        await queryRunner.query(`CREATE INDEX "IDX_a103498328a90babd98007c9a1" ON "campaign" ("endDate") `);
        await queryRunner.query(`CREATE INDEX "IDX_08135474cffdb8282c4ff37271" ON "campaign" ("status") `);
        await queryRunner.query(`CREATE INDEX "IDX_f04c2ce9b8b29b7348134ad30a" ON "campaign" ("isGlobal") `);
        await queryRunner.query(`CREATE INDEX "IDX_dea97e26c765a4cdb575957a14" ON "user" ("identityId") `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DROP INDEX "IDX_dea97e26c765a4cdb575957a14"`);
        await queryRunner.query(`DROP INDEX "IDX_f04c2ce9b8b29b7348134ad30a"`);
        await queryRunner.query(`DROP INDEX "IDX_08135474cffdb8282c4ff37271"`);
        await queryRunner.query(`DROP INDEX "IDX_a103498328a90babd98007c9a1"`);
        await queryRunner.query(`DROP INDEX "IDX_4293bebb45d5083b55b41ac95d"`);
    }
}
