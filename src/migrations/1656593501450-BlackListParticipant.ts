import {MigrationInterface, QueryRunner} from "typeorm";

export class BlackListParticipant1656593501450 implements MigrationInterface {
    name = 'BlackListParticipant1656593501450'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "participant" ADD "blackList" boolean NOT NULL DEFAULT false`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "participant" DROP COLUMN "blackList"`);
    }

}
