import type { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Renomeia price_cents para price em machines e armazena valor em reais (numeric).
 */
export class MachinesPriceReais1740100000000 implements MigrationInterface {
  name = 'MachinesPriceReais1740100000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "machines"
      ADD COLUMN IF NOT EXISTS "price" NUMERIC(10,2) NOT NULL DEFAULT 5
    `);
    const hasPriceCents = await queryRunner.query(`
      SELECT 1 FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = 'machines' AND column_name = 'price_cents'
      LIMIT 1
    `);
    if (Array.isArray(hasPriceCents) && hasPriceCents.length > 0) {
      await queryRunner.query(`UPDATE "machines" SET "price" = "price_cents" / 100.0`);
      await queryRunner.query(`ALTER TABLE "machines" DROP COLUMN "price_cents"`);
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "machines"
      ADD COLUMN IF NOT EXISTS "price_cents" integer NOT NULL DEFAULT 500
    `);
    await queryRunner.query(`UPDATE "machines" SET "price_cents" = (price * 100)::integer WHERE price IS NOT NULL`);
    await queryRunner.query(`ALTER TABLE "machines" DROP COLUMN IF EXISTS "price"`);
  }
}
