import { NextRequest, NextResponse } from 'next/server';
import { getDataSource } from '@/lib/db';
import { Session, SessionStatus } from '@/lib/entities-all';
import { Payment } from '@/lib/entities-all';
import { emitSessionEvent } from '@/lib/events';
import { getPaymentStatus } from '@/lib/mercadopago';

/**
 * GET: consulta o status do pagamento (polling).
 * Se o pagamento for no Mercado Pago (externalId não mock), consulta a API do MP.
 * Se estiver aprovado no MP, atualiza Payment e Session e emite PAID.
 * Usado quando não há webhook (ex.: app acessada por IP sem túnel).
 */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: sessionId } = await params;
    const ds = await getDataSource();
    const session = await ds.getRepository(Session).findOne({
      where: { id: sessionId },
    });
    if (!session) {
      return NextResponse.json({ error: 'Sessão não encontrada' }, { status: 404 });
    }

    const paymentRepo = ds.getRepository(Payment);
    const payment = await paymentRepo.findOne({ where: { sessionId } });
    if (!payment) {
      return NextResponse.json({ status: 'pending' });
    }

    if (payment.status === 'approved') {
      return NextResponse.json({ status: 'approved' });
    }

    const externalId = payment.externalId;
    if (!externalId || externalId.startsWith('mock')) {
      return NextResponse.json({ status: 'pending' });
    }

    const mpStatus = await getPaymentStatus(externalId);
    const approved = mpStatus?.status === 'approved' || mpStatus?.status === 'authorized';
    if (!approved) {
      return NextResponse.json({ status: 'pending' });
    }

    payment.status = 'approved';
    payment.paidAt = new Date();
    await paymentRepo.save(payment);

    session.status = SessionStatus.PAID;
    await ds.getRepository(Session).save(session);
    emitSessionEvent(sessionId, 'PAID');

    return NextResponse.json({ status: 'approved' });
  } catch (e) {
    console.error('[payment-status]', e);
    return NextResponse.json({ status: 'pending' });
  }
}
