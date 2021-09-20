import {MigrationInterface, QueryRunner} from "typeorm";

export class RelationFixes1632173695938 implements MigrationInterface {
    name = 'RelationFixes1632173695938'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "campaign" ALTER COLUMN "keywords" SET DEFAULT '[]'`);
        await queryRunner.query(`ALTER TABLE "xoxoday_order" ADD CONSTRAINT "FK_e0883ce6ef869534d2013fc414b" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "xoxoday_order" DROP CONSTRAINT "FK_e0883ce6ef869534d2013fc414b"`);
        await queryRunner.query(`ALTER TABLE "campaign" ALTER COLUMN "keywords" SET DEFAULT ARRAY[]`);
    }

}
