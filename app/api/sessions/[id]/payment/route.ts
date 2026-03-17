import { NextRequest, NextResponse } from 'next/server';
import { getDataSource } from '@/lib/db';
import { Session, SessionStatus } from '@/lib/entities-all';
import { Payment } from '@/lib/entities-all';
import { emitSessionEvent } from '@/lib/events';
import { getMercadoPagoConfig, isMercadoPagoConfigured, createPixPayment } from '@/lib/mercadopago';

const DEFAULT_EXPIRATION_MINUTES = 5;
const FALLBACK_EXPIRATION_MS = DEFAULT_EXPIRATION_MINUTES * 60 * 1000;

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: sessionId } = await params;
    const body = await request.json().catch(() => ({}));
    const mpConfig = await getMercadoPagoConfig();
    const payerEmail =
      typeof body.payerEmail === 'string' && body.payerEmail.trim()
        ? body.payerEmail.trim()
        : mpConfig?.payerEmail ?? process.env.MP_PAYER_EMAIL ?? 'kiosk@limpezacapacetes.local';

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

    const amountCents = session.price;
    const amountReais = amountCents / 100;

    let payment = existing;
    if (!payment) {
      payment = paymentRepo.create({
        sessionId,
        provider: 'mercadopago',
        amount: amountCents,
        status: 'pending',
        externalId: null,
      });
      await paymentRepo.save(payment);
    }

    if (await isMercadoPagoConfigured()) {
      try {
        const mpResult = await createPixPayment({
          amountReais,
          description: `Limpeza capacete - Sessão ${sessionId}`,
          payerEmail,
          idempotencyKey: `${sessionId}-${payment.id}`,
        });
        payment.externalId = mpResult.id;
        const alreadyApproved = mpResult.status === 'approved' || mpResult.status === 'authorized';
        if (alreadyApproved) {
          payment.status = 'approved';
          payment.paidAt = new Date();
          await paymentRepo.save(payment);
          session.status = SessionStatus.PAID;
          await ds.getRepository(Session).save(session);
          emitSessionEvent(sessionId, 'PAID');
          return NextResponse.json({
            status: 'approved',
            qrCode: null,
            expiresAt: null,
            paymentId: payment.id,
          });
        }

        const maxExpires = new Date(Date.now() + FALLBACK_EXPIRATION_MS);
        const mpExpires = mpResult.dateOfExpiration ? new Date(mpResult.dateOfExpiration) : null;
        const expiresAt = mpExpires && mpExpires.getTime() < maxExpires.getTime()
          ? mpExpires
          : maxExpires;

        return NextResponse.json({
          status: 'pending',
          qrCode: mpResult.qrCode,
          expiresAt: expiresAt.toISOString(),
          paymentId: payment.id,
        });
      } catch (e) {
        console.error('[payment] Mercado Pago error:', e);
        return NextResponse.json(
          { error: 'Erro ao criar cobrança. Tente novamente.' },
          { status: 502 }
        );
      }
    }

    // Mock quando MP não configurado
    payment.externalId = `mock_${sessionId}_${Date.now()}`;
    await paymentRepo.save(payment);
    const expiresAt = new Date(Date.now() + FALLBACK_EXPIRATION_MS);
    const qrCode = `00020126580014br.gov.bcb.pix0136mock-${sessionId}-${payment.id}520400005303986540${amountReais.toFixed(2)}5802BR62070503***6304`;
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
