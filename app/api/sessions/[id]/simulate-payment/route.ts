import { NextRequest, NextResponse } from 'next/server';
import { getDataSource } from '@/lib/db';
import { Session, SessionStatus } from '@/lib/entities-all';
import { Payment } from '@/lib/entities-all';
import { emitSessionEvent } from '@/lib/events';

export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: sessionId } = await params;
    const ds = await getDataSource();
    const session = await ds.getRepository(Session).findOne({ where: { id: sessionId } });
    if (!session) {
      return NextResponse.json({ error: 'Sessão não encontrada' }, { status: 404 });
    }
    const paymentRepo = ds.getRepository(Payment);
    let payment = await paymentRepo.findOne({ where: { sessionId } });
    if (payment) {
      payment.status = 'approved';
      payment.paidAt = new Date();
      await paymentRepo.save(payment);
    } else {
      payment = paymentRepo.create({
        sessionId,
        provider: 'mercadopago',
        amount: session.price,
        status: 'approved',
        externalId: `sim_${sessionId}`,
        paidAt: new Date(),
      });
      await paymentRepo.save(payment);
    }
    session.status = SessionStatus.PAID;
    await ds.getRepository(Session).save(session);
    emitSessionEvent(sessionId, 'PAID');
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: 'Erro' }, { status: 500 });
  }
}
