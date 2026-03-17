import type { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Adiciona coupon_id em sessions para permitir apenas um cupom por sessão.
 */
export class SessionCouponId1740300000000 implements MigrationInterface {
  name = 'SessionCouponId1740300000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "sessions"
      ADD COLUMN IF NOT EXISTS "coupon_id" uuid
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "sessions" DROP COLUMN IF EXISTS "coupon_id"`);
  }
}
