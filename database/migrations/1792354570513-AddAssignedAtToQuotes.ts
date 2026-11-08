import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddAssignedAtToQuotes1792354570513 implements MigrationInterface {
  name = 'AddAssignedAtToQuotes1792354570513';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "quotes" ADD "assignedAt" TIMESTAMP`);
    await queryRunner.query(
      `UPDATE "quotes" SET "assignedAt" = "updated_at" WHERE "assignedCleanerId" IS NOT NULL`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "quotes" DROP COLUMN "assignedAt"`);
  }
}
