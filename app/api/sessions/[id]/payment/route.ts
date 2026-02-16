import { NextRequest, NextResponse } from 'next/server';
import { getDataSource } from '@/lib/db';
import { Session, SessionStatus } from '@/lib/entities-all';
import { Payment } from '@/lib/entities-all';
import { emitSessionEvent } from '@/lib/events';

export async function POST(
  request: NextRequest,
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
    if (session.status !== SessionStatus.CREATED) {
      return NextResponse.json(
        { error: 'Sessão já possui pagamento em andamento ou pago' },
        { status: 400 }
      );
    }

    const paymentRepo = ds.getRepository(Payment);
    const existing = await paymentRepo.findOne({
      where: { sessionId },
    });
    if (existing && existing.status === 'approved') {
      return NextResponse.json({
        status: 'approved',
        qrCode: null,
        expiresAt: null,
      });
    }

    const amount = session.price;
    const expiresAt = new Date(Date.now() + 30 * 60 * 1000);

    let payment = existing;
    if (!payment) {
      payment = paymentRepo.create({
        sessionId,
        provider: 'mercadopago',
        amount,
        status: 'pending',
        externalId: `mock_${sessionId}_${Date.now()}`,
      });
      await paymentRepo.save(payment);
    }

    const qrCode = `00020126580014br.gov.bcb.pix0136mock-${sessionId}-${payment.id}520400005303986540${(amount / 100).toFixed(2)}5802BR62070503***6304`;
    return NextResponse.json({
      status: 'pending',
      qrCode,
      expiresAt: expiresAt.toISOString(),
      paymentId: payment.id,
    });
  } catch (e) {
    console.error(e);
    return NextResponse.json(
      { error: 'Erro ao criar cobrança' },
      { status: 500 }
    );
  }
}
