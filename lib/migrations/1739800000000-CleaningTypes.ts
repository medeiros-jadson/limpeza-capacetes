import type { MigrationInterface, QueryRunner } from 'typeorm';

export class CleaningTypes1739800000000 implements MigrationInterface {
  name = 'CleaningTypes1739800000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "cleaning_types" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "name" character varying(255) NOT NULL,
        "price_cents" integer NOT NULL,
        "duration_seconds" integer NOT NULL,
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_cleaning_types" PRIMARY KEY ("id")
      )
    `);
    await queryRunner.query(`
      ALTER TABLE "sessions"
      ADD COLUMN IF NOT EXISTS "cleaning_type_id" uuid,
      ADD COLUMN IF NOT EXISTS "duration_seconds" integer
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "sessions" DROP COLUMN IF EXISTS "duration_seconds"`);
    await queryRunner.query(`ALTER TABLE "sessions" DROP COLUMN IF EXISTS "cleaning_type_id"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "cleaning_types"`);
  }
}
