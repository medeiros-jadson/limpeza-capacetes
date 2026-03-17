import { NextRequest, NextResponse } from 'next/server';
import { getDataSource } from '@/lib/db';
import { Session, SessionStatus } from '@/lib/entities-all';
import { Payment } from '@/lib/entities-all';
import { emitSessionEvent } from '@/lib/events';
import { getMercadoPagoConfig, isMercadoPagoConfigured, createPixPayment, getPaymentDetails } from '@/lib/mercadopago';

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
        : mpConfig?.payerEmail ?? 'kiosk@limpezacapacetes.local';

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

        await paymentRepo.save(payment);

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
        const err = e as { status?: number; message?: string };
        const isIdempotencyConflict =
          err?.status === 423 ||
          (typeof err?.message === 'string' &&
            (err.message.includes('Already posted the same request') ||
              err.message.includes('resource_already_locked')));

        if (isIdempotencyConflict) {
          let pay = await paymentRepo.findOne({ where: { sessionId } });
          if (!pay?.externalId) {
            await new Promise((r) => setTimeout(r, 1200));
            pay = await paymentRepo.findOne({ where: { sessionId } });
          }
          if (pay?.externalId) {
            const details = await getPaymentDetails(pay.externalId);
            if (details) {
              const maxExpires = new Date(Date.now() + FALLBACK_EXPIRATION_MS);
              const mpExpires = details.dateOfExpiration ? new Date(details.dateOfExpiration) : null;
              const expiresAt =
                mpExpires && mpExpires.getTime() < maxExpires.getTime() ? mpExpires : maxExpires;
              return NextResponse.json({
                status: 'pending',
                qrCode: details.qrCode,
                expiresAt: expiresAt.toISOString(),
                paymentId: pay.id,
              });
            }
          }
        }

        console.error('[payment] Mercado Pago error:', e);
        return NextResponse.json(
          { error: 'Erro ao criar cobrança. Tente novamente.' },
          { status: 502 }
        );
      }
    }

    return NextResponse.json(
      { error: 'Pagamento PIX não configurado. Cadastre o Mercado Pago na tabela mercadopago_config (ou via PATCH /api/config/mercadopago).' },
      { status: 503 }
    );
  } catch (e) {
    console.error(e);
    return NextResponse.json(
      { error: 'Erro ao criar cobrança' },
      { status: 500 }
    );
  }
}
