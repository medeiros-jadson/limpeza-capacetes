import type { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Função para cadastrar tipo de limpeza com valor em REAIS (ex.: 2.60 ou 0.60).
 * Uso no banco:
 *   SELECT insert_cleaning_type('Limpeza Básica', 2.60, 360);
 *   SELECT insert_cleaning_type('Promoção', 0.60, 180);
 */
export class CleaningTypeInsertReais1739900000000 implements MigrationInterface {
  name = 'CleaningTypeInsertReais1739900000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Garante coluna price_cents (pode não existir se a tabela veio de FixCleaningTypesType ou estado antigo)
    await queryRunner.query(`
      ALTER TABLE "cleaning_types"
      ADD COLUMN IF NOT EXISTS "price_cents" integer NOT NULL DEFAULT 0
    `);
    const hasPrice = await queryRunner.query(`
      SELECT 1 FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = 'cleaning_types' AND column_name = 'price'
      LIMIT 1
    `);
    if (Array.isArray(hasPrice) && hasPrice.length > 0) {
      await queryRunner.query(`UPDATE "cleaning_types" SET "price_cents" = (ROUND("price" * 100))::integer WHERE "price" IS NOT NULL`);
    }
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

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP FUNCTION IF EXISTS insert_cleaning_type(character varying, decimal, integer)`);
  }
}
