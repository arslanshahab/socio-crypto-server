import {MigrationInterface, QueryRunner} from "typeorm";

export class KYCApplication1634331551544 implements MigrationInterface {
    name = 'KYCApplication1634331551544'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TABLE "verification_application" ("applicationId" character varying NOT NULL, "status" character varying NOT NULL, "userId" uuid, CONSTRAINT "PK_1831686ef76854c14ec36b15876" PRIMARY KEY ("applicationId"))`);
        await queryRunner.query(`ALTER TABLE "factor_link" ADD "verificationId" uuid`);
        await queryRunner.query(`ALTER TABLE "verification_application" ADD CONSTRAINT "FK_79e9b3d653b00690eae5f235dad" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "factor_link" ADD CONSTRAINT "FK_af734dc6c22a087728b5c63789e" FOREIGN KEY ("verificationId") REFERENCES "user"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "factor_link" DROP CONSTRAINT "FK_af734dc6c22a087728b5c63789e"`);
        await queryRunner.query(`ALTER TABLE "verification_application" DROP CONSTRAINT "FK_79e9b3d653b00690eae5f235dad"`);
        await queryRunner.query(`ALTER TABLE "factor_link" DROP COLUMN "verificationId"`);
        await queryRunner.query(`DROP TABLE "verification_application"`);
    }

}
