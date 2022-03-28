import { MigrationInterface, QueryRunner } from "typeorm";

export class KycUUID1648458215118 implements MigrationInterface {
    name = "KycUUID1648458215118";

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(
            `ALTER TABLE "verification_application" ADD "id" uuid NOT NULL DEFAULT gen_random_uuid()`
        );
        await queryRunner.query(
            `ALTER TABLE "verification_application" DROP CONSTRAINT "PK_1831686ef76854c14ec36b15876"`
        );
        await queryRunner.query(
            `ALTER TABLE "verification_application" ADD CONSTRAINT "PK_11937a3af56f6377cf5cda8f20a" PRIMARY KEY ("applicationId", "id")`
        );
        await queryRunner.query(
            `ALTER TABLE "verification_application" DROP CONSTRAINT "PK_11937a3af56f6377cf5cda8f20a"`
        );
        await queryRunner.query(
            `ALTER TABLE "verification_application" ADD CONSTRAINT "PK_9a21866200edef5f625c56bcdf9" PRIMARY KEY ("id")`
        );
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(
            `ALTER TABLE "verification_application" DROP CONSTRAINT "PK_9a21866200edef5f625c56bcdf9"`
        );
        await queryRunner.query(
            `ALTER TABLE "verification_application" ADD CONSTRAINT "PK_11937a3af56f6377cf5cda8f20a" PRIMARY KEY ("applicationId", "id")`
        );
        await queryRunner.query(
            `ALTER TABLE "verification_application" DROP CONSTRAINT "PK_11937a3af56f6377cf5cda8f20a"`
        );
        await queryRunner.query(
            `ALTER TABLE "verification_application" ADD CONSTRAINT "PK_1831686ef76854c14ec36b15876" PRIMARY KEY ("applicationId")`
        );
        await queryRunner.query(`ALTER TABLE "verification_application" DROP COLUMN "id"`);
    }
}
