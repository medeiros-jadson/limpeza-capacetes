import { MercadoPagoConfig as MPConfig, Payment } from 'mercadopago';
import { getDataSource } from './data-source';
import { MercadoPagoConfig } from './entities-all';

export type MercadoPagoConfigRow = {
  accessToken: string | null;
  payerEmail: string | null;
  webhookSecret: string | null;
  active: boolean;
};

/**
 * Carrega a configuração do Mercado Pago do banco (primeira linha da tabela mercadopago_config).
 * Fallback: se a tabela estiver vazia ou não existir, usa variáveis de ambiente (MP_ACCESS_TOKEN, etc.).
 */
export async function getMercadoPagoConfig(): Promise<MercadoPagoConfigRow | null> {
  try {
    const ds = await getDataSource();
    const repo = ds.getRepository(MercadoPagoConfig);
    const row = await repo.findOne({ where: {}, order: { createdAt: 'ASC' } });
    if (row && row.active && row.accessToken?.trim()) {
      return {
        accessToken: row.accessToken.trim(),
        payerEmail: row.payerEmail?.trim() ?? null,
        webhookSecret: row.webhookSecret?.trim() ?? null,
        active: row.active,
      };
    }
  } catch (e) {
    console.error('[mercadopago] getMercadoPagoConfig error:', e);
  }
  const envToken = process.env.MP_ACCESS_TOKEN?.trim();
  if (envToken) {
    return {
      accessToken: envToken,
      payerEmail: process.env.MP_PAYER_EMAIL?.trim() ?? null,
      webhookSecret: process.env.MP_WEBHOOK_SECRET?.trim() ?? null,
      active: true,
    };
  }
  return null;
}

export async function isMercadoPagoConfigured(): Promise<boolean> {
  const config = await getMercadoPagoConfig();
  return Boolean(config?.accessToken);
}

export type CreatePixPaymentParams = {
  amountReais: number;
  description: string;
  payerEmail: string;
  idempotencyKey: string;
};

export type CreatePixPaymentResult = {
  id: string;
  status: string;
  qrCode: string;
  qrCodeBase64?: string;
  dateOfExpiration: string | null;
};

/**
 * Cria um pagamento PIX via API do Mercado Pago.
 * Usa configuração do banco (ou env); falha se não houver access token.
 */
export async function createPixPayment(
  params: CreatePixPaymentParams
): Promise<CreatePixPaymentResult> {
  const config = await getMercadoPagoConfig();
  if (!config?.accessToken) {
    throw new Error('Mercado Pago não configurado (access_token ausente no banco ou MP_ACCESS_TOKEN)');
  }

  const mpConfig = new MPConfig({ accessToken: config.accessToken });
  const paymentClient = new Payment(mpConfig);

  const { amountReais, description, payerEmail, idempotencyKey } = params;
  const isTestToken = config.accessToken.startsWith('TEST-');
  const response = await paymentClient.create({
    body: {
      transaction_amount: amountReais,
      payment_method_id: 'pix',
      payer: {
        email: payerEmail,
        ...(isTestToken && { first_name: 'APRO' }),
      },
      description: description.slice(0, 255),
    },
    requestOptions: {
      idempotencyKey,
    },
  });

  console.log('[mercadopago] createPixPayment resposta:', {
    id: response.id,
    status: response.status,
    status_detail: response.status_detail,
    date_of_expiration: response.date_of_expiration,
    point_of_interaction: response.point_of_interaction
      ? {
          type: response.point_of_interaction.type,
          transaction_data: response.point_of_interaction.transaction_data
            ? {
                qr_code: (response.point_of_interaction.transaction_data.qr_code ?? '').slice(0, 60) + '...',
                ticket_url: response.point_of_interaction.transaction_data.ticket_url,
              }
            : undefined,
        }
      : undefined,
  });

  const id = response.id != null ? String(response.id) : '';
  const status = response.status ?? 'pending';
  const poi = response.point_of_interaction;
  const txData = poi?.transaction_data;
  const qrCode = txData?.qr_code ?? '';
  const qrCodeBase64 = txData?.qr_code_base64;
  const dateOfExpiration = response.date_of_expiration ?? null;

  if (!qrCode) {
    console.error('[mercadopago] Resposta sem qr_code:', { id, status, response });
    throw new Error('Resposta do Mercado Pago sem QR Code PIX');
  }

  return {
    id,
    status,
    qrCode,
    qrCodeBase64,
    dateOfExpiration,
  };
}

/**
 * Busca o status de um pagamento no Mercado Pago.
 * Usa access token do banco (ou env).
 */
export async function getPaymentStatus(paymentId: string): Promise<{ status: string } | null> {
  const config = await getMercadoPagoConfig();
  if (!config?.accessToken) return null;
  const mpConfig = new MPConfig({ accessToken: config.accessToken });
  const paymentClient = new Payment(mpConfig);
  try {
    const response = await paymentClient.get({ id: paymentId });
    console.log('[mercadopago] getPaymentStatus resposta:', {
      paymentId,
      status: response.status,
      status_detail: response.status_detail,
    });
    return { status: response.status ?? 'unknown' };
  } catch (e) {
    console.error('[mercadopago] getPaymentStatus error:', e);
    return null;
  }
}
