import { NextRequest, NextResponse } from 'next/server';
import { getDataSource } from '@/lib/db';
import { MercadoPagoConfig } from '@/lib/entities-all';

function maskToken(token: string | null): string {
  if (!token || token.length < 8) return token ?? '';
  return token.slice(0, 6) + '...' + token.slice(-4);
}

/**
 * GET: retorna a configuração atual (access_token mascarado por segurança).
 */
export async function GET() {
  try {
    const ds = await getDataSource();
    const repo = ds.getRepository(MercadoPagoConfig);
    const row = await repo.findOne({ where: {}, order: { createdAt: 'ASC' } });
    if (!row) {
      return NextResponse.json({
        configured: false,
        accessToken: null,
        accessTokenMasked: null,
        payerEmail: null,
        webhookSecret: null,
        active: false,
      });
    }
    return NextResponse.json({
      id: row.id,
      configured: Boolean(row.accessToken?.trim()),
      accessTokenMasked: maskToken(row.accessToken),
      payerEmail: row.payerEmail,
      webhookSecret: row.webhookSecret ? '***' : null,
      active: row.active,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    });
  } catch (e) {
    console.error('[config/mercadopago] GET error:', e);
    return NextResponse.json({ error: 'Erro ao buscar configuração' }, { status: 500 });
  }
}

/**
 * PATCH: atualiza a configuração do Mercado Pago.
 * Body: { accessToken?: string, payerEmail?: string, webhookSecret?: string, active?: boolean }
 * Em produção, proteja este endpoint (ex.: header de admin ou variável de ambiente).
 */
export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));
    const ds = await getDataSource();
    const repo = ds.getRepository(MercadoPagoConfig);
    let row = await repo.findOne({ where: {}, order: { createdAt: 'ASC' } });
    if (!row) {
      row = repo.create({
        accessToken: typeof body.accessToken === 'string' ? body.accessToken.trim() || null : null,
        payerEmail: typeof body.payerEmail === 'string' ? body.payerEmail.trim() || null : null,
        webhookSecret: typeof body.webhookSecret === 'string' ? body.webhookSecret.trim() || null : null,
        active: typeof body.active === 'boolean' ? body.active : true,
      });
      await repo.save(row);
      return NextResponse.json({ ok: true, id: row.id });
    }
    if (typeof body.accessToken === 'string') row.accessToken = body.accessToken.trim() || null;
    if (typeof body.payerEmail === 'string') row.payerEmail = body.payerEmail.trim() || null;
    if (typeof body.webhookSecret === 'string') row.webhookSecret = body.webhookSecret.trim() || null;
    if (typeof body.active === 'boolean') row.active = body.active;
    row.updatedAt = new Date();
    await repo.save(row);
    return NextResponse.json({ ok: true, id: row.id });
  } catch (e) {
    console.error('[config/mercadopago] PATCH error:', e);
    return NextResponse.json({ error: 'Erro ao atualizar configuração' }, { status: 500 });
  }
}
