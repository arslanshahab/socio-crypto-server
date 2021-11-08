import {MigrationInterface, QueryRunner} from "typeorm";

export class RelationFixesLatest1636131254206 implements MigrationInterface {
    name = 'RelationFixesLatest1636131254206'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "transfer" ADD "userId" uuid`);
        await queryRunner.query(`ALTER TABLE "transfer" ADD CONSTRAINT "FK_79345be54b82de8207be305a9d3" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "transfer" DROP CONSTRAINT "FK_79345be54b82de8207be305a9d3"`);
        await queryRunner.query(`ALTER TABLE "transfer" DROP COLUMN "userId"`);
    }

}
