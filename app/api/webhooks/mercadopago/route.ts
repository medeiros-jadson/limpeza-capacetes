import { NextRequest, NextResponse } from 'next/server';
import { getDataSource } from '@/lib/db';
import { Payment } from '@/lib/entities-all';
import { Session, SessionStatus } from '@/lib/entities-all';
import { emitSessionEvent } from '@/lib/events';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const type = body.type as string;
    const data = body.data as { id?: string } | undefined;
    const paymentId = data?.id ?? body.data?.id;

    if (type !== 'payment' || !paymentId) {
      return NextResponse.json({ received: true });
    }

    const ds = await getDataSource();
    const paymentRepo = ds.getRepository(Payment);
    let payment = await paymentRepo.findOne({
      where: { externalId: paymentId },
    });

    if (payment?.status === 'approved') {
      return NextResponse.json({ received: true });
    }

    if (!payment) {
      return NextResponse.json({ received: true });
    }

    payment.status = 'approved';
    payment.paidAt = new Date();
    await paymentRepo.save(payment);

    const sessionRepo = ds.getRepository(Session);
    const session = await sessionRepo.findOne({
      where: { id: payment.sessionId },
    });
    if (session) {
      session.status = SessionStatus.PAID;
      await sessionRepo.save(session);
      emitSessionEvent(session.id, 'PAID');
    }

    return NextResponse.json({ received: true });
  } catch (e) {
    console.error(e);
    return NextResponse.json(
      { error: 'Erro no webhook' },
      { status: 500 }
    );
  }
}
