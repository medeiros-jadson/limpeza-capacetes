import { NextRequest, NextResponse } from 'next/server';
import { getDataSource } from '@/lib/db';
import { Payment } from '@/lib/entities-all';
import { Session, SessionStatus } from '@/lib/entities-all';
import { emitSessionEvent } from '@/lib/events';
import { getPaymentStatus } from '@/lib/mercadopago';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    console.log('[mercadopago] webhook recebido:', { type: body.type, data: body.data });

    const type = body.type as string;
    const data = body.data as { id?: string } | undefined;
    const paymentId = data?.id ?? body.data?.id;
    const paymentIdStr = paymentId != null ? String(paymentId) : '';

    if (type !== 'payment' || !paymentIdStr) {
      return NextResponse.json({ received: true });
    }

    const ds = await getDataSource();
    const paymentRepo = ds.getRepository(Payment);
    const payment = await paymentRepo.findOne({
      where: { externalId: paymentIdStr },
    });

    if (payment?.status === 'approved') {
      console.log('[mercadopago] webhook: pagamento já aprovado', paymentIdStr);
      return NextResponse.json({ received: true });
    }

    if (!payment) {
      console.log('[mercadopago] webhook: pagamento não encontrado no banco', paymentIdStr);
      return NextResponse.json({ received: true });
    }

    const mpStatus = await getPaymentStatus(paymentIdStr);
    const approved = mpStatus?.status === 'approved' || mpStatus?.status === 'authorized';
    if (!approved) {
      console.log('[mercadopago] webhook: status no MP não aprovado', { paymentIdStr, mpStatus });
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
      console.log('[mercadopago] webhook: sessão marcada como PAID', session.id);
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
