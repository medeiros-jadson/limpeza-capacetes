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
