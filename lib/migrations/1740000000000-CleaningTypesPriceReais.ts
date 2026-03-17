import type { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Renomeia price_cents para price e armazena valor em reais (numeric).
 */
export class CleaningTypesPriceReais1740000000000 implements MigrationInterface {
  name = 'CleaningTypesPriceReais1740000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "cleaning_types"
      ADD COLUMN IF NOT EXISTS "price" NUMERIC(10,2) NOT NULL DEFAULT 0
    `);
    const hasPriceCents = await queryRunner.query(`
      SELECT 1 FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = 'cleaning_types' AND column_name = 'price_cents'
      LIMIT 1
    `);
    if (Array.isArray(hasPriceCents) && hasPriceCents.length > 0) {
      await queryRunner.query(`UPDATE "cleaning_types" SET "price" = "price_cents" / 100.0`);
      await queryRunner.query(`ALTER TABLE "cleaning_types" DROP COLUMN "price_cents"`);
    }
    await queryRunner.query(`
      CREATE OR REPLACE FUNCTION insert_cleaning_type(
        p_name character varying(255),
        p_price_reais decimal,
        p_duration_seconds integer
      ) RETURNS uuid AS $$
        INSERT INTO cleaning_types (id, name, price, duration_seconds, created_at)
        VALUES (uuid_generate_v4(), p_name, p_price_reais, p_duration_seconds, now())
        RETURNING id;
      $$ LANGUAGE sql;
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "cleaning_types"
      ADD COLUMN IF NOT EXISTS "price_cents" integer NOT NULL DEFAULT 0
    `);
    await queryRunner.query(`
      UPDATE "cleaning_types" SET "price_cents" = (price * 100)::integer WHERE price IS NOT NULL
    `);
    await queryRunner.query(`ALTER TABLE "cleaning_types" DROP COLUMN IF EXISTS "price"`);
    await queryRunner.query(`
      CREATE OR REPLACE FUNCTION insert_cleaning_type(
        p_name character varying(255),
        p_price_reais decimal,
        p_duration_seconds integer
      ) RETURNS uuid AS $$
        INSERT INTO cleaning_types (id, name, price_cents, duration_seconds, created_at)
        VALUES (uuid_generate_v4(), p_name, (ROUND(p_price_reais * 100))::integer, p_duration_seconds, now())
        RETURNING id;
      $$ LANGUAGE sql;
    `);
  }
}
