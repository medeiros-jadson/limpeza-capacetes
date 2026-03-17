import { NextRequest, NextResponse } from 'next/server';
import { getDataSource } from '@/lib/db';
import { Session, SessionStatus } from '@/lib/entities-all';
import { Payment } from '@/lib/entities-all';
import { Coupon } from '@/lib/entities-all';
import { emitSessionEvent } from '@/lib/events';
import { getMercadoPagoConfig, isMercadoPagoConfigured, createPixPayment } from '@/lib/mercadopago';

const FALLBACK_EXPIRATION_MS = 5 * 60 * 1000;

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: sessionId } = await params;
    const body = await request.json().catch(() => ({}));
    const code = typeof body.code === 'string' ? body.code.trim().toUpperCase() : '';
    const mpConfig = await getMercadoPagoConfig();
    const payerEmail =
      typeof body.payerEmail === 'string' && body.payerEmail.trim()
        ? body.payerEmail.trim()
        : mpConfig?.payerEmail ?? 'kiosk@limpezacapacetes.local';

    if (!code) {
      return NextResponse.json({ applied: false, error: 'Código do cupom é obrigatório' }, { status: 400 });
    }

    const ds = await getDataSource();
    const session = await ds.getRepository(Session).findOne({ where: { id: sessionId } });
    if (!session) {
      return NextResponse.json({ error: 'Sessão não encontrada' }, { status: 404 });
    }
    if (session.status !== SessionStatus.CREATED) {
      return NextResponse.json(
        { applied: false, error: 'Sessão já foi paga ou está em andamento' },
        { status: 400 }
      );
    }
    if (session.couponId != null) {
      return NextResponse.json(
        { applied: false, error: 'Apenas um cupom por sessão' },
        { status: 400 }
      );
    }

    const coupon = await ds.getRepository(Coupon).findOne({
      where: { code, active: true },
    });
    if (!coupon) {
      return NextResponse.json({ applied: false, error: 'Cupom inválido ou inativo' }, { status: 400 });
    }

    const discountPercent = Math.min(100, Math.max(0, coupon.discountPercent));
    const originalAmountCents = session.price;
    const discountedAmountCents = Math.round(originalAmountCents * (1 - discountPercent / 100));

    if (discountPercent === 100 || discountedAmountCents <= 0) {
      const paymentRepo = ds.getRepository(Payment);
      let payment = await paymentRepo.findOne({ where: { sessionId } });
      if (payment) {
        payment.status = 'approved';
        payment.paidAt = new Date();
        payment.amount = 0;
        await paymentRepo.save(payment);
      } else {
        payment = paymentRepo.create({
          sessionId,
          provider: 'mercadopago',
          amount: 0,
          status: 'approved',
          externalId: `coupon_${sessionId}`,
          paidAt: new Date(),
        });
        await paymentRepo.save(payment);
      }
      session.status = SessionStatus.PAID;
      session.couponId = coupon.id;
      await ds.getRepository(Session).save(session);
      emitSessionEvent(sessionId, 'PAID');
      return NextResponse.json({
        applied: true,
        discountPercent: 100,
        redirectToProgress: true,
      });
    }

    const paymentRepo = ds.getRepository(Payment);
    const amountReais = discountedAmountCents / 100;
    let payment = await paymentRepo.findOne({ where: { sessionId } });
    if (payment) {
      payment.amount = discountedAmountCents;
      payment.status = 'pending';
      payment.externalId = null;
      payment.paidAt = null;
      await paymentRepo.save(payment);
    } else {
      payment = paymentRepo.create({
        sessionId,
        provider: 'mercadopago',
        amount: discountedAmountCents,
        status: 'pending',
        externalId: null,
      });
      await paymentRepo.save(payment);
    }

    session.couponId = coupon.id;
    await ds.getRepository(Session).save(session);

    if (await isMercadoPagoConfigured()) {
      try {
        const mpResult = await createPixPayment({
          amountReais,
          description: `Limpeza capacete (cupom) - Sessão ${sessionId}`,
          payerEmail,
          idempotencyKey: `${sessionId}-coupon-${Date.now()}`,
        });
        payment.externalId = mpResult.id;
        await paymentRepo.save(payment);
        const maxExpires = new Date(Date.now() + FALLBACK_EXPIRATION_MS);
        const mpExpires = mpResult.dateOfExpiration ? new Date(mpResult.dateOfExpiration) : null;
        const expiresAt = mpExpires && mpExpires.getTime() < maxExpires.getTime()
          ? mpExpires
          : maxExpires;
        return NextResponse.json({
          applied: true,
          discountPercent,
          redirectToProgress: false,
          qrCode: mpResult.qrCode,
          expiresAt: expiresAt.toISOString(),
          finalPriceReais: amountReais,
        });
      } catch (e) {
        console.error('[apply-coupon] Mercado Pago error:', e);
        return NextResponse.json(
          { applied: false, error: 'Erro ao gerar novo PIX. Tente novamente.' },
          { status: 502 }
        );
      }
    }

    return NextResponse.json(
      { applied: false, error: 'Pagamento PIX não configurado. Cadastre o Mercado Pago na tabela mercadopago_config.' },
      { status: 503 }
    );
  } catch (e) {
    console.error(e);
    return NextResponse.json(
      { applied: false, error: 'Erro ao aplicar cupom' },
      { status: 500 }
    );
  }
}
